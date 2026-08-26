const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const pool = require('../config/db');
const { getTodayIST } = require('../utils/dateUtils');
const { canActorAccessBatch } = require('./attendanceController');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DEFAULT_SESSION_MINUTES = 5; // fallback if a batch somehow has no value set

// Admin or Faculty: generate a new QR session for a batch
async function generateSession(req, res) {
  const { batchId } = req.params;

  try {
    if (!(await canActorAccessBatch(req.actor, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const batchRes = await pool.query('SELECT qr_validity_minutes FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    const sessionMinutes = batchRes.rows[0].qr_validity_minutes || DEFAULT_SESSION_MINUTES;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + sessionMinutes * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO qr_sessions (batch_id, session_token, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [batchId, token, expiresAt]
    );

    const session = result.rows[0];
    const scanUrl = `${FRONTEND_URL}/scan/${token}`;
    const qrDataUrl = await QRCode.toDataURL(scanUrl);

    res.status(201).json({ session, scanUrl, qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Public: get session status (used by scan page to check if still valid)
async function getSessionStatus(req, res) {
  const { token } = req.params;
  try {
    const result = await pool.query('SELECT * FROM qr_sessions WHERE session_token = $1', [token]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });

    const session = result.rows[0];
    const expired = new Date() > new Date(session.expires_at);
    res.json({ batchId: session.batch_id, expiresAt: session.expires_at, expired });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Public: student submits urn from the scanned page
async function submitAttendance(req, res) {
  const { token } = req.params;
  const { firstName, lastName, deviceToken } = req.body;
  const urn = (req.body.urn || '').replace(/\s+/g, '');

  if (!urn || !firstName || !lastName || !deviceToken) {
    return res.status(400).json({ error: 'urn, firstName, lastName and deviceToken are required' });
  }
  try {
    const sessionRes = await pool.query('SELECT * FROM qr_sessions WHERE session_token = $1', [token]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Invalid QR session' });

    const session = sessionRes.rows[0];
    if (new Date() > new Date(session.expires_at)) {
      return res.status(410).json({ error: 'This QR code has expired' });
    }

    // one submission per device per session
    const dupe = await pool.query(
      'SELECT 1 FROM qr_submissions WHERE qr_session_id = $1 AND device_token = $2',
      [session.id, deviceToken]
    );
    if (dupe.rows.length > 0) {
      return res.status(409).json({ error: 'This device has already submitted attendance for this session' });
    }

    // anti-proxy cooldown: this device may submit at most 2 times (across any
    // sessions/batches) within a rolling 15-minute window
    const cooldown = await pool.query(
      `SELECT COUNT(*) AS count FROM qr_submissions
       WHERE device_token = $1 AND submitted_at > now() - interval '15 minutes'`,
      [deviceToken]
    );
    const recentSubmissions = parseInt(cooldown.rows[0].count, 10);
    if (recentSubmissions >= 2) {
      return res.status(429).json({
        error: 'This device has submitted attendance too many times recently. Please wait a few minutes and try again.',
      });
    }

    // match student by urn, within the correct batch
    const studentRes = await pool.query(
      `SELECT * FROM students WHERE urn = $1 AND batch_id = $2`,
      [urn, session.batch_id]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'No student with this URN found in this batch' });
    }

    const student = studentRes.rows[0];
    if (student.is_blacklisted) {
      return res.status(403).json({ error: 'This student is blacklisted and cannot mark attendance' });
    }

    // record the submission (for dedup / audit trail)
    await pool.query(
      `INSERT INTO qr_submissions (qr_session_id, student_id, device_token, submitted_first_name, submitted_last_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [session.id, student.id, deviceToken, firstName.trim(), lastName.trim()]
    );
    // upsert attendance for today (in IST, not server UTC)
    const today = getTodayIST();
    await pool.query(
      `INSERT INTO attendance (student_id, batch_id, date, qr_session_id, status, method)
       VALUES ($1, $2, $3, $4, 'present', 'qr')
       ON CONFLICT (student_id, date)
       DO UPDATE SET status = 'present', method = 'qr', qr_session_id = $4, marked_at = now()`,
      [student.id, session.batch_id, today, session.id]
    );

    res.json({ message: `Attendance marked for ${student.first_name} ${student.last_name}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
// Admin or Faculty: get the response sheet for a session (list of who submitted)
async function getSessionReport(req, res) {
  const { sessionId } = req.params;
  try {
    const sessionRes = await pool.query('SELECT * FROM qr_sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];

    if (!(await canActorAccessBatch(req.actor, session.batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const result = await pool.query(
      `SELECT s.urn, qs.submitted_first_name AS first_name, qs.submitted_last_name AS last_name, qs.submitted_at
       FROM qr_submissions qs
       JOIN students s ON s.id = qs.student_id
       WHERE qs.qr_session_id = $1
       ORDER BY qs.submitted_at`,
      [sessionId]
    );
    res.json({ submissions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
// Admin or Faculty: download the response sheet for a session as a CSV file
async function downloadSessionReport(req, res) {
  const { sessionId } = req.params;
  try {
    const sessionRes = await pool.query('SELECT * FROM qr_sessions WHERE id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    const session = sessionRes.rows[0];

    if (!(await canActorAccessBatch(req.actor, session.batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const submissionsRes = await pool.query(
      `SELECT s.urn, qs.submitted_first_name AS first_name, qs.submitted_last_name AS last_name, qs.submitted_at
   FROM qr_submissions qs
   JOIN students s ON s.id = qs.student_id
   WHERE qs.qr_session_id = $1
   ORDER BY qs.submitted_at`,
      [sessionId]
    );

    // build CSV, escaping any field that contains a comma, quote, or newline
    const escapeCsv = (val) => {
      const str = String(val ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const header = ['URN', 'First Name', 'Last Name', 'Submitted At'];
    const rows = submissionsRes.rows.map((r) => [
      r.urn,
      r.first_name,
      r.last_name,
      new Date(r.submitted_at).toISOString(),
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');

    const filename = `attendance-batch${session.batch_id}-session${session.id}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { generateSession, getSessionStatus, submitAttendance, getSessionReport, downloadSessionReport };