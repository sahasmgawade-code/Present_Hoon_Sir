const pool = require('../config/db');
const { uploadFileToBatchFolder, uploadSubmissionFile, deleteFile } = require('../utils/googleDrive');

async function hasBatchAccess(facultyId, batchId) {
  const result = await pool.query(
    'SELECT 1 FROM faculty_batches WHERE faculty_id = $1 AND batch_id = $2',
    [facultyId, batchId]
  );
  return result.rows.length > 0;
}

// List batches this faculty has been assigned to
async function getMyBatches(req, res) {
  try {
    const result = await pool.query(
      `SELECT b.id, b.name
       FROM batches b
       JOIN faculty_batches fb ON fb.batch_id = b.id
       WHERE fb.faculty_id = $1 AND b.is_archived = FALSE
       ORDER BY b.name`,
      [req.faculty.id]
    );
    res.json({ batches: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// List students in one of this faculty's batches (read-only — faculty don't manage students)
async function getBatchStudents(req, res) {
  const { batchId } = req.params;
  try {
    if (!(await hasBatchAccess(req.faculty.id, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }
    const result = await pool.query(
      `SELECT id, urn, first_name, last_name, is_blacklisted
       FROM students WHERE batch_id = $1 ORDER BY first_name`,
      [batchId]
    );
    res.json({ students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Post a new assignment (PDF) for a batch — uploads to Google Drive first
async function createAssignment(req, res) {
  const { batchId } = req.params;
  const { title, description, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    if (!(await hasBatchAccess(req.faculty.id, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const batchRes = await pool.query('SELECT name FROM batches WHERE id = $1', [batchId]);
    if (batchRes.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });
    const batchName = batchRes.rows[0].name;

    const { fileId, webViewLink } = await uploadFileToBatchFolder({
      batchId,
      batchName,
      fileName: `${Date.now()}-${req.file.originalname}`,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
    });

    const result = await pool.query(
      `INSERT INTO assignments (batch_id, faculty_id, title, description, due_date, drive_file_id, drive_file_url, file_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [batchId, req.faculty.id, title.trim(), description || null, dueDate || null, fileId, webViewLink, req.file.originalname]
    );

    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// List all assignments posted for a batch (by any faculty with access to it)
async function listBatchAssignments(req, res) {
  const { batchId } = req.params;
  try {
    if (!(await hasBatchAccess(req.faculty.id, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }
    const result = await pool.query(
      `SELECT a.*, f.name AS faculty_name,
              (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submission_count
       FROM assignments a
       LEFT JOIN faculties f ON f.id = a.faculty_id
       WHERE a.batch_id = $1
       ORDER BY a.created_at DESC`,
      [batchId]
    );
    res.json({ assignments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Delete an assignment — cleans up its Drive file and all submission Drive files
async function deleteAssignment(req, res) {
  const { id } = req.params;
  try {
    const assignmentRes = await pool.query('SELECT * FROM assignments WHERE id = $1', [id]);
    if (assignmentRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = assignmentRes.rows[0];

    if (!(await hasBatchAccess(req.faculty.id, assignment.batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const submissions = await pool.query(
      'SELECT drive_file_id FROM assignment_submissions WHERE assignment_id = $1',
      [id]
    );
    for (const s of submissions.rows) {
      await deleteFile(s.drive_file_id);
    }
    await deleteFile(assignment.drive_file_id);

    await pool.query('DELETE FROM assignments WHERE id = $1', [id]);
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// List every student in the batch alongside their submission (or lack of one) for an assignment
async function listSubmissions(req, res) {
  const { id } = req.params; // assignment id
  try {
    const assignmentRes = await pool.query('SELECT * FROM assignments WHERE id = $1', [id]);
    if (assignmentRes.rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    const assignment = assignmentRes.rows[0];

    if (!(await hasBatchAccess(req.faculty.id, assignment.batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const result = await pool.query(
      `SELECT st.id AS student_id, st.urn, st.first_name, st.last_name,
              sub.id AS submission_id, sub.drive_file_url, sub.file_name,
              sub.status, sub.remark, sub.submitted_at, sub.reviewed_at
       FROM students st
       LEFT JOIN assignment_submissions sub
         ON sub.student_id = st.id AND sub.assignment_id = $1
       WHERE st.batch_id = $2
       ORDER BY st.first_name`,
      [id, assignment.batch_id]
    );

    res.json({ assignment, students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Faculty grades a submission: status + optional custom remark
async function gradeSubmission(req, res) {
  const { id } = req.params; // submission id
  const { status, remark } = req.body;

  if (!['pending', 'completed', 'incomplete'].includes(status)) {
    return res.status(400).json({ error: "status must be 'pending', 'completed', or 'incomplete'" });
  }

  try {
    const subRes = await pool.query(
      `SELECT sub.id, a.batch_id
       FROM assignment_submissions sub
       JOIN assignments a ON a.id = sub.assignment_id
       WHERE sub.id = $1`,
      [id]
    );
    if (subRes.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });

    if (!(await hasBatchAccess(req.faculty.id, subRes.rows[0].batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const result = await pool.query(
      `UPDATE assignment_submissions
       SET status = $1, remark = $2, reviewed_at = now()
       WHERE id = $3
       RETURNING *`,
      [status, remark || null, id]
    );

    res.json({ submission: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getMyBatches,
  getBatchStudents,
  createAssignment,
  listBatchAssignments,
  deleteAssignment,
  listSubmissions,
  gradeSubmission,
};