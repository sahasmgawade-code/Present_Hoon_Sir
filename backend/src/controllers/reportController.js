const pool = require('../config/db');

async function canAccessBatch(admin, batchId) {
  if (admin.role === 'super_admin') return true;
  const result = await pool.query(
    'SELECT 1 FROM batch_admins WHERE batch_id = $1 AND admin_id = $2',
    [batchId, admin.id]
  );
  return result.rows.length > 0;
}

// Helper: are two admins "collaborators" — do they share access to at least one batch?
async function isCollaboratorWith(adminId, otherAdminId) {
  if (adminId === otherAdminId) return true;
  const result = await pool.query(
    `SELECT 1 FROM batch_admins ba1
     JOIN batch_admins ba2 ON ba1.batch_id = ba2.batch_id
     WHERE ba1.admin_id = $1 AND ba2.admin_id = $2
     LIMIT 1`,
    [adminId, otherAdminId]
  );
  return result.rows.length > 0;
}

// Helper: can req.admin access this specific student row (batch-assigned or not)?
async function canAccessStudent(admin, student) {
  if (admin.role === 'super_admin') return true;
  if (student.batch_id) {
    return canAccessBatch(admin, student.batch_id);
  }
  // Unassigned student: only visible to its creator, or the creator's collaborators
  if (!student.created_by) return false;
  return isCollaboratorWith(admin.id, student.created_by);
}

// Batch report: per-student stats + defaulter split (< 75%) vs good standing (>= 75%)
// Optional ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD restricts the calculation to that
// window. Omit both for the all-time report.
async function getBatchReport(req, res) {
  const { batchId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    if (!(await canAccessBatch(req.admin, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const params = [batchId];
    let dateFilter = '';
    if (startDate) {
      params.push(startDate);
      dateFilter += ` AND date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateFilter += ` AND date <= $${params.length}`;
    }

    const workingDaysRes = await pool.query(
      `SELECT COUNT(DISTINCT date) AS total FROM attendance WHERE batch_id = $1${dateFilter}`,
      params
    );
    const totalWorkingDays = parseInt(workingDaysRes.rows[0].total, 10) || 0;

    const studentsRes = await pool.query(
      `SELECT s.id, s.urn, s.first_name, s.last_name,
              COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_count
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id = s.id AND a.batch_id = $1${dateFilter}
       WHERE s.batch_id = $1
       GROUP BY s.id
       ORDER BY s.first_name`,
      params
    );

    const allStudents = studentsRes.rows.map(s => {
      const presentCount = parseInt(s.present_count, 10) || 0;
      const percentage = totalWorkingDays > 0
        ? Math.round((presentCount / totalWorkingDays) * 10000) / 100
        : 0;
      return {
        studentId: s.id,
        urn: s.urn,
        firstName: s.first_name,
        lastName: s.last_name,
        presentCount,
        totalWorkingDays,
        percentage,
      };
    });

    const defaulters = allStudents.filter(s => s.percentage < 75);
    const goodStanding = allStudents.filter(s => s.percentage >= 75);

    res.json({
      batchId: parseInt(batchId, 10),
      totalWorkingDays,
      startDate: startDate || null,
      endDate: endDate || null,
      defaulters,
      goodStanding,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Individual student report: full attendance history + summary
async function getStudentReport(req, res) {
  const { studentId } = req.params;

  try {
    const studentRes = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    const student = studentRes.rows[0];

    if (!(await canAccessStudent(req.admin, student))) {
      return res.status(403).json({ error: 'No access to this student' });
    }

    const workingDaysRes = await pool.query(
      'SELECT COUNT(DISTINCT date) AS total FROM attendance WHERE batch_id = $1',
      [student.batch_id]
    );
    const totalWorkingDays = parseInt(workingDaysRes.rows[0].total, 10) || 0;

    const historyRes = await pool.query(
      `SELECT date, status, method, marked_at
       FROM attendance
       WHERE student_id = $1 AND batch_id = $2
       ORDER BY date DESC`,
      [studentId, student.batch_id]
    );

    const presentCount = historyRes.rows.filter(r => r.status === 'present').length;
    const percentage = totalWorkingDays > 0
      ? Math.round((presentCount / totalWorkingDays) * 10000) / 100
      : 0;

    res.json({
      student: {
        id: student.id,
        urn: student.urn,
        firstName: student.first_name,
        lastName: student.last_name,
        phone: student.phone,
        email: student.email,
        parentPhone: student.parent_phone,
        isBlacklisted: student.is_blacklisted,
      },
      totalWorkingDays,
      presentCount,
      percentage,
      history: historyRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Batch attendance matrix: URN, Name, per-date present/absent, and overall %.
// Used for the Excel export. Optional ?startDate=&endDate= restricts the range.
async function getBatchAttendanceMatrix(req, res) {
  const { batchId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    if (!(await canAccessBatch(req.admin, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const params = [batchId];
    let dateFilterPlain = '';
    let dateFilterA = '';
    if (startDate) {
      params.push(startDate);
      dateFilterPlain += ` AND date >= $${params.length}`;
      dateFilterA += ` AND a.date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateFilterPlain += ` AND date <= $${params.length}`;
      dateFilterA += ` AND a.date <= $${params.length}`;
    }

    // All distinct attendance dates in range, in order -> these become the columns
    const datesRes = await pool.query(
      `SELECT DISTINCT date FROM attendance WHERE batch_id = $1${dateFilterPlain} ORDER BY date`,
      params
    );
    const dates = datesRes.rows.map((r) => r.date);

    // Every student in the batch, left-joined with their attendance rows
    const rowsRes = await pool.query(
      `SELECT s.id AS student_id, s.urn, s.first_name, s.last_name, a.date, a.status
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id = s.id AND a.batch_id = $1${dateFilterA}
       WHERE s.batch_id = $1
       ORDER BY s.first_name, a.date`,
      params
    );

    const studentMap = new Map();
    for (const row of rowsRes.rows) {
      if (!studentMap.has(row.student_id)) {
        studentMap.set(row.student_id, {
          studentId: row.student_id,
          urn: row.urn,
          firstName: row.first_name,
          lastName: row.last_name,
          statuses: {},
          presentCount: 0,
        });
      }
      if (row.date) {
        const entry = studentMap.get(row.student_id);
        entry.statuses[row.date] = row.status;
        if (row.status === 'present') entry.presentCount += 1;
      }
    }

    const totalWorkingDays = dates.length;
    const students = Array.from(studentMap.values()).map((s) => ({
      ...s,
      totalWorkingDays,
      percentage:
        totalWorkingDays > 0
          ? Math.round((s.presentCount / totalWorkingDays) * 10000) / 100
          : 0,
    }));

    res.json({
      batchId: parseInt(batchId, 10),
      dates,
      startDate: startDate || null,
      endDate: endDate || null,
      students,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getBatchReport, getStudentReport, getBatchAttendanceMatrix };