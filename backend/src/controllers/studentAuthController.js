const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { uploadSubmissionFile, deleteFile } = require('../utils/googleDrive');
async function studentLogin(req, res) {
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.status(400).json({ error: 'loginId and password are required' });
  }
  try {
    const result = await pool.query(
      'SELECT id, batch_id, first_name, last_name, urn, password_hash FROM students WHERE login_id = $1',
      [loginId.trim()]
    );
    const student = result.rows[0];
    if (!student || !student.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, student.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { studentId: student.id, batchId: student.batch_id, type: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.cookie('phsams_student_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        urn: student.urn,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
async function getMyAttendance(req, res) {
  const { studentId, batchId } = req.student;
  try {
    const studentRes = await pool.query(
      `SELECT s.id, s.urn, s.first_name, s.last_name, s.is_blacklisted,
              b.id AS batch_id, b.name AS batch_name
       FROM students s
       JOIN batches b ON b.id = s.batch_id
       WHERE s.id = $1`,
      [studentId]
    );
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const student = studentRes.rows[0];
    const workingDaysRes = await pool.query(
      'SELECT COUNT(DISTINCT date) AS total FROM attendance WHERE batch_id = $1',
      [batchId]
    );
    const totalWorkingDays = parseInt(workingDaysRes.rows[0].total, 10) || 0;
    const historyRes = await pool.query(
      `SELECT date, status, method, marked_at
       FROM attendance
       WHERE student_id = $1 AND batch_id = $2
       ORDER BY date DESC`,
      [studentId, batchId]
    );
    const presentCount = historyRes.rows.filter((r) => r.status === 'present').length;
    const percentage = totalWorkingDays > 0
      ? Math.round((presentCount / totalWorkingDays) * 10000) / 100
      : 0;

    res.json({
      student: {
        id: student.id,
        urn: student.urn,
        firstName: student.first_name,
        lastName: student.last_name,
        isBlacklisted: student.is_blacklisted,
      },
      batch: {
        id: student.batch_id,
        name: student.batch_name,
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
async function getMyAssignments(req, res) {
  const { studentId, batchId } = req.student;
  try {
    const result = await pool.query(
      `SELECT a.id, a.title, a.description, a.due_date, a.drive_file_url, a.file_name, a.created_at,
              f.name AS faculty_name,
              sub.id AS submission_id, sub.drive_file_url AS submission_url,
              sub.file_name AS submission_file_name, sub.status, sub.remark,
              sub.submitted_at, sub.reviewed_at
       FROM assignments a
       LEFT JOIN faculties f ON f.id = a.faculty_id
       LEFT JOIN assignment_submissions sub
         ON sub.assignment_id = a.id AND sub.student_id = $1
       WHERE a.batch_id = $2
       ORDER BY a.created_at DESC`,
      [studentId, batchId]
    );
    res.json({ assignments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
async function submitAssignment(req, res) {
  const { studentId, batchId } = req.student;
  const { assignmentId } = req.params;
  try {
    const assignmentRes = await pool.query(
      `SELECT a.id, a.title, a.batch_id, b.name AS batch_name
       FROM assignments a
       JOIN batches b ON b.id = a.batch_id
       WHERE a.id = $1`,
      [assignmentId]
    );
    if (assignmentRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = assignmentRes.rows[0];
    if (assignment.batch_id !== batchId) {
      return res.status(403).json({ error: 'This assignment is not for your batch' });
    }
    const existing = await pool.query(
      'SELECT drive_file_id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [assignmentId, studentId]
    );
    if (existing.rows.length > 0) {
      await deleteFile(existing.rows[0].drive_file_id);
    }
    const { fileId, webViewLink } = await uploadSubmissionFile({
      batchId: assignment.batch_id,
      batchName: assignment.batch_name,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      fileName: `${Date.now()}-student${studentId}-${req.file.originalname}`,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    });
    const result = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, drive_file_id, drive_file_url, file_name, status, remark, submitted_at, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NULL, now(), NULL)
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET drive_file_id = $3, drive_file_url = $4, file_name = $5,
                     status = 'pending', remark = NULL, submitted_at = now(), reviewed_at = NULL
       RETURNING *`,
      [assignmentId, studentId, fileId, webViewLink, req.file.originalname]
    );
    res.json({ submission: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
function studentLogout(req, res) {
  res.clearCookie('phsams_student_token', { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
  res.json({ message: 'Logged out' });
}
module.exports = { studentLogin, getMyAttendance, getMyAssignments, submitAssignment, studentLogout };