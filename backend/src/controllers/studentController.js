const pool = require('../config/db');
const bcrypt = require('bcrypt');
// Helper: check if req.admin can access a given batch
async function canAccessBatch(admin, batchId) {
  if (admin.role === 'super_admin') return true;
  const result = await pool.query(
    'SELECT 1 FROM batch_admins WHERE batch_id = $1 AND admin_id = $2',
    [batchId, admin.id]
  );
  return result.rows.length > 0;
}

// Add a student to a batch
// Add a student to a batch
async function addStudent(req, res) {
  const { batchId } = req.params;
  const { urn, firstName, lastName, phone, email, parentPhone, confirmed } = req.body;

  if (!urn || !firstName || !lastName) {
    return res.status(400).json({ error: 'urn, firstName, and lastName are required' });
  }

  try {
    if (!(await canAccessBatch(req.admin, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const normalizedUrn = urn.replace(/\s+/g, '').toUpperCase();

    // Block only a true duplicate: same URN already in THIS batch
    const existingInBatch = await pool.query(
      'SELECT id FROM students WHERE urn = $1 AND batch_id = $2',
      [normalizedUrn, batchId]
    );
    if (existingInBatch.rows.length > 0) {
      return res.status(409).json({ error: 'This URN already exists in this batch' });
    }

    // Check if this URN already exists in any OTHER batch
    const otherBatchesRes = await pool.query(
      `SELECT s.batch_id, b.name AS batch_name
       FROM students s
       JOIN batches b ON b.id = s.batch_id
       WHERE s.urn = $1`,
      [normalizedUrn]
    );
    const existingBatches = otherBatchesRes.rows.map((r) => ({
      batchId: r.batch_id,
      batchName: r.batch_name,
    }));

    // If found elsewhere and admin hasn't confirmed yet, alert instead of inserting
    if (existingBatches.length > 0 && !confirmed) {
      return res.status(200).json({
        requiresConfirmation: true,
        message: `This student (URN ${normalizedUrn}) is already enrolled in ${existingBatches.length} other batch(es).`,
        existingBatches,
      });
    }

    const result = await pool.query(
      `INSERT INTO students (batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at`,
      [batchId, normalizedUrn, firstName, lastName, phone || null, email || null, parentPhone || null]
    );
    res.status(201).json({
      student: result.rows[0],
      ...(existingBatches.length > 0 ? { alreadyInOtherBatches: existingBatches } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
// List students in a batch
async function listStudents(req, res) {
  const { batchId } = req.params;
  try {
    if (!(await canAccessBatch(req.admin, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const result = await pool.query(
      `SELECT id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at
       FROM students WHERE batch_id = $1 ORDER BY first_name`,
      [batchId]
    );
    res.json({ students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Edit a student's details
async function updateStudent(req, res) {
  const { studentId } = req.params;
  const { firstName, lastName, phone, email, parentPhone } = req.body;

  try {
    const studentRes = await pool.query('SELECT batch_id FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (!(await canAccessBatch(req.admin, studentRes.rows[0].batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const result = await pool.query(
      `UPDATE students SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        parent_phone = COALESCE($5, parent_phone)
       WHERE id = $6
       RETURNING id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at`,
      [firstName, lastName, phone, email, parentPhone, studentId]
    );

    res.json({ student: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Delete a student
async function deleteStudent(req, res) {
  const { studentId } = req.params;
  try {
    const studentRes = await pool.query('SELECT batch_id FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (!(await canAccessBatch(req.admin, studentRes.rows[0].batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    await pool.query('DELETE FROM students WHERE id = $1', [studentId]);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Blacklist / unblacklist a student (super_admin and admins with access to the student's batch)
async function setBlacklist(req, res) {
  const { studentId } = req.params;
  const { blacklisted } = req.body; // true/false

  if (typeof blacklisted !== 'boolean') {
    return res.status(400).json({ error: 'blacklisted (boolean) is required' });
  }

  try {
    const studentRes = await pool.query('SELECT batch_id FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (!(await canAccessBatch(req.admin, studentRes.rows[0].batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const result = await pool.query(
      `UPDATE students SET is_blacklisted = $1 WHERE id = $2
       RETURNING id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at`,
      [blacklisted, studentId]
    );

    res.json({ student: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Admin: set or reset a student's Login ID + password for the student self-service portal
async function setStudentCredentials(req, res) {
  const { studentId } = req.params;
  const { loginId, password } = req.body;

  if (!loginId || !loginId.trim()) {
    return res.status(400).json({ error: 'loginId is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }

  try {
    const studentRes = await pool.query('SELECT batch_id FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (!(await canAccessBatch(req.admin, studentRes.rows[0].batch_id))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const normalizedLoginId = loginId.trim();

    const existing = await pool.query(
      'SELECT id FROM students WHERE login_id = $1 AND id != $2',
      [normalizedLoginId, studentId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This Login ID is already taken by another student' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `UPDATE students SET login_id = $1, password_hash = $2
       WHERE id = $3
       RETURNING id, login_id`,
      [normalizedLoginId, hash, studentId]
    );

    res.json({ student: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { addStudent, listStudents, updateStudent, deleteStudent, setBlacklist, setStudentCredentials };