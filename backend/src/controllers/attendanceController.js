const pool = require('../config/db');
const { sendEmail } = require('../utils/mailer');
const { sendSMS } = require('../utils/smsSender');
const { escapeHtml } = require('../utils/htmlEscape');
async function notifyAbsentees(batchId, date, studentIds, actor) {
  try {
    if (studentIds.length === 0) return;
    const batchRes = await pool.query('SELECT name FROM batches WHERE id = $1', [batchId]);
    const batchName = batchRes.rows[0]?.name || `Batch #${batchId}`;
    const studentsRes = await pool.query(
      `SELECT id, first_name, last_name, email, parent_phone FROM students WHERE id = ANY($1::int[])`,
      [studentIds]
    );
    let smsAllowed = true;
    if (actor.type === 'admin') {
      const actingAdminRes = await pool.query(
        'SELECT sms_notifications_enabled FROM admins WHERE id = $1',
        [actor.id]
      );
      smsAllowed = actingAdminRes.rows[0]?.sms_notifications_enabled === true;
    }
    for (const student of studentsRes.rows) {
      const studentName = `${student.first_name} ${student.last_name}`;
      const html = `
        <h2>Attendance Update — PHS-AMS</h2>
        <p><strong>Student:</strong> ${escapeHtml(studentName)}</p>
        <p><strong>Status:</strong> Absent</p>
        <p><strong>Date:</strong> ${escapeHtml(date)}</p>
        <p><strong>Batch:</strong> ${escapeHtml(batchName)}</p>
      `;
      if (student.email) {
        sendEmail({
          to: student.email,
          subject: `Absent: ${studentName} — ${batchName} (${date})`,
          html,
        }).catch((err) => console.error(`Failed to email ${student.email}:`, err.message));
      }
      if (smsAllowed && student.parent_phone) {
        sendSMS({
          phoneNumber: student.parent_phone,
          message: `PHS-AMS: ${studentName} was marked ABSENT on ${date} for ${batchName}.`,
        }).catch((err) => console.error(`Failed to SMS ${student.parent_phone}:`, err.message));
      }
    }
  } catch (err) {
    console.error('Error notifying absentees:', err.message);
  }
}
async function canActorAccessBatch(actor, batchId) {
  if (actor.type === 'admin') {
    if (actor.role === 'super_admin') return true;
    const result = await pool.query(
      'SELECT 1 FROM batch_admins WHERE batch_id = $1 AND admin_id = $2',
      [batchId, actor.id]
    );
    return result.rows.length > 0;
  }
  if (actor.type === 'faculty') {
    const result = await pool.query(
      'SELECT 1 FROM faculty_batches WHERE batch_id = $1 AND faculty_id = $2',
      [batchId, actor.id]
    );
    return result.rows.length > 0;
  }
  return false;
}
async function getAttendanceForDate(req, res) {
  const { batchId } = req.params;
  const { date } = req.query; // e.g. ?date=2026-07-15
  if (!date) return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
  try {
    if (!(await canActorAccessBatch(req.actor, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }
    const result = await pool.query(
      `SELECT s.id AS student_id, s.urn, s.first_name, s.last_name,
              COALESCE(a.status, 'absent') AS status,
              a.method
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id = s.id AND a.date = $2
       WHERE s.batch_id = $1
       ORDER BY s.first_name`,
      [batchId, date]
    );
    res.json({ date, students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
async function saveAttendanceForDate(req, res) {
  const { batchId } = req.params;
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'date and records[] are required' });
  }
  try {
    if (!(await canActorAccessBatch(req.actor, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }
    const existing = await pool.query(
      'SELECT student_id, status FROM attendance WHERE batch_id = $1 AND date = $2',
      [batchId, date]
    );
    const prevStatus = new Map(existing.rows.map((r) => [r.student_id, r.status]));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of records) {
        if (!['present', 'absent'].includes(r.status)) continue;
        const hadExisting = prevStatus.has(r.studentId);
        if (hadExisting && prevStatus.get(r.studentId) === r.status) continue;
        await client.query(
          `INSERT INTO attendance (student_id, batch_id, date, status, method, marked_at)
           VALUES ($1, $2, $3, $4, 'manual', now())
           ON CONFLICT (student_id, date)
           DO UPDATE SET status = $4, method = 'manual', marked_at = now()`,
          [r.studentId, batchId, date, r.status]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    const newlyAbsentIds = records
      .filter((r) => r.status === 'absent' && prevStatus.get(r.studentId) !== 'absent')
      .map((r) => r.studentId);
    notifyAbsentees(batchId, date, newlyAbsentIds, req.actor);
    res.json({ message: 'Attendance saved', date, count: records.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
module.exports = { getAttendanceForDate, saveAttendanceForDate, canActorAccessBatch };