const pool = require('../config/db');
const { sendEmail } = require('../utils/mailer');
const { sendSMS } = require('../utils/smsSender');
const { escapeHtml } = require('../utils/htmlEscape');
// Email every eligible admin, and SMS parents, when a student is newly marked absent
async function notifyAbsentees(batchId, date, studentIds, actingAdminId) {
  try {
    if (studentIds.length === 0) return;

    const batchRes = await pool.query('SELECT name FROM batches WHERE id = $1', [batchId]);
    const batchName = batchRes.rows[0]?.name || `Batch #${batchId}`;

    const studentsRes = await pool.query(
      `SELECT id, first_name, last_name, parent_phone FROM students WHERE id = ANY($1::int[])`,
      [studentIds]
    );

    const recipientsRes = await pool.query(
      `SELECT DISTINCT a.email, a.name
       FROM admins a
       LEFT JOIN batch_admins ba ON ba.admin_id = a.id AND ba.batch_id = $1
       WHERE a.email_notifications_enabled = true
         AND (a.role = 'super_admin' OR ba.admin_id IS NOT NULL)`,
      [batchId]
    );

    // SMS is only sent if the admin who marked attendance has SMS notifications enabled
    // (this flag is controlled by the Super Admin on each admin's settings page)
    const actingAdminRes = await pool.query(
      'SELECT sms_notifications_enabled FROM admins WHERE id = $1',
      [actingAdminId]
    );
    const smsAllowed = actingAdminRes.rows[0]?.sms_notifications_enabled === true;

    if (recipientsRes.rows.length === 0 && !smsAllowed) return;

    for (const student of studentsRes.rows) {
      const studentName = `${student.first_name} ${student.last_name}`;
      const html = `
        <h2>Attendance Update — PHS-AMS</h2>
        <p><strong>Student:</strong> ${escapeHtml(studentName)}</p>
        <p><strong>Status:</strong> Absent</p>
        <p><strong>Date:</strong> ${escapeHtml(date)}</p>
        <p><strong>Batch:</strong> ${escapeHtml(batchName)}</p>
      `;

      for (const recipient of recipientsRes.rows) {
        sendEmail({
          to: recipient.email,
          subject: `Absent: ${studentName} — ${batchName} (${date})`,
          html,
        }).catch((err) => console.error(`Failed to email ${recipient.email}:`, err.message));
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

async function canAccessBatch(admin, batchId) {
  if (admin.role === 'super_admin') return true;
  const result = await pool.query(
    'SELECT 1 FROM batch_admins WHERE batch_id = $1 AND admin_id = $2',
    [batchId, admin.id]
  );
  return result.rows.length > 0;
}

// Get attendance for a batch on a specific date (for the Edit Attendance page)
// Students with no record show as 'absent' by default, but no row exists yet.
async function getAttendanceForDate(req, res) {
  const { batchId } = req.params;
  const { date } = req.query; // e.g. ?date=2026-07-15

  if (!date) return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });

  try {
    if (!(await canAccessBatch(req.admin, batchId))) {
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

// Bulk save attendance for a batch on a specific date
// Body: { date: '2026-07-15', records: [{ studentId: 1, status: 'present' }, ...] }
async function saveAttendanceForDate(req, res) {
  const { batchId } = req.params;
  const { date, records } = req.body;

  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'date and records[] are required' });
  }

  try {
    if (!(await canAccessBatch(req.admin, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    // snapshot previous statuses so we only email NEW absences, not every re-save
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

    // fire-and-forget email alerts for students newly marked absent
    const newlyAbsentIds = records
      .filter((r) => r.status === 'absent' && prevStatus.get(r.studentId) !== 'absent')
      .map((r) => r.studentId);
    notifyAbsentees(batchId, date, newlyAbsentIds, req.admin.id);

    res.json({ message: 'Attendance saved', date, count: records.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
module.exports = { getAttendanceForDate, saveAttendanceForDate };