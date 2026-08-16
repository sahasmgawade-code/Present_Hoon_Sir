const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Helper: check if req.admin can access a given (non-null) batch
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

// Get a single student by ID
async function getStudentById(req, res) {
  const { studentId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at, created_by
       FROM students WHERE id = $1`,
      [studentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    const student = result.rows[0];
    if (!(await canAccessStudent(req.admin, student))) {
      return res.status(403).json({ error: 'No access to this student' });
    }

    res.json({ student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Add a student. batchId may come from the URL (bulk import into a specific
// batch, via /students/batch/:batchId) or from the request body via the
// generic /students endpoint — where it's optional. Omitting it leaves the
// student unassigned (batch_id = NULL), visible only to its creator and
// that creator's collaborators.
async function addStudent(req, res) {
  const batchId = req.params.batchId || req.body.batchId || null;
  const { urn, firstName, lastName, phone, email, parentPhone, confirmed } = req.body;

  if (!urn || !firstName || !lastName) {
    return res.status(400).json({ error: 'urn, firstName, and lastName are required' });
  }

  try {
    if (batchId && !(await canAccessBatch(req.admin, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const normalizedUrn = urn.replace(/\s+/g, '').toUpperCase();

    if (batchId) {
      // Block only a true duplicate: same URN already in THIS batch
      const existingInBatch = await pool.query(
        'SELECT id FROM students WHERE urn = $1 AND batch_id = $2',
        [normalizedUrn, batchId]
      );
      if (existingInBatch.rows.length > 0) {
        return res.status(409).json({ error: 'This URN already exists in this batch' });
      }
    } else {
      // Unique constraint on (urn, batch_id) doesn't catch NULL vs NULL duplicates —
      // check manually so the same URN can't be added twice as "unassigned"
      const existingUnassigned = await pool.query(
        'SELECT id FROM students WHERE urn = $1 AND batch_id IS NULL',
        [normalizedUrn]
      );
      if (existingUnassigned.rows.length > 0) {
        return res.status(409).json({ error: 'This URN already exists as an unassigned student' });
      }
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

    // Cross-batch confirmation only matters when enrolling into a specific batch
    if (batchId && existingBatches.length > 0 && !confirmed) {
      return res.status(200).json({
        requiresConfirmation: true,
        message: `This student (URN ${normalizedUrn}) is already enrolled in ${existingBatches.length} other batch(es).`,
        existingBatches,
      });
    }

    const result = await pool.query(
      `INSERT INTO students (batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
       RETURNING id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at, created_by`,
      [batchId, normalizedUrn, firstName, lastName, phone || null, email || null, parentPhone || null, req.admin.id]
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

// List students in a specific batch (used by bulk import / batch-scoped views)
async function listStudents(req, res) {
  const { batchId } = req.params;
  try {
    if (!(await canAccessBatch(req.admin, batchId))) {
      return res.status(403).json({ error: 'No access to this batch' });
    }

    const result = await pool.query(
      `SELECT id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at, created_by
       FROM students WHERE batch_id = $1 ORDER BY first_name`,
      [batchId]
    );
    res.json({ students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// List every student visible to req.admin, across all their batches plus
// their own (and their collaborators') unassigned students. Used by the
// "View Students" page. Each row includes batch_name (null = unassigned).
async function listMyStudents(req, res) {
  try {
    let result;
    if (req.admin.role === 'super_admin') {
      result = await pool.query(
        `SELECT s.id, s.batch_id, s.urn, s.first_name, s.last_name, s.phone, s.email,
                s.parent_phone, s.is_blacklisted, s.login_id, s.created_at, s.created_by,
                b.name AS batch_name
         FROM students s
         LEFT JOIN batches b ON b.id = s.batch_id
         ORDER BY s.first_name`
      );
    } else {
      result = await pool.query(
        `SELECT s.id, s.batch_id, s.urn, s.first_name, s.last_name, s.phone, s.email,
                s.parent_phone, s.is_blacklisted, s.login_id, s.created_at, s.created_by,
                b.name AS batch_name
         FROM students s
         LEFT JOIN batches b ON b.id = s.batch_id
         WHERE
           s.batch_id IN (SELECT batch_id FROM batch_admins WHERE admin_id = $1)
           OR (
             s.batch_id IS NULL AND (
               s.created_by = $1
               OR s.created_by IN (
                 SELECT ba2.admin_id FROM batch_admins ba1
                 JOIN batch_admins ba2 ON ba1.batch_id = ba2.batch_id
                 WHERE ba1.admin_id = $1
               )
             )
           )
         ORDER BY s.first_name`,
        [req.admin.id]
      );
    }
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
    const studentRes = await pool.query('SELECT batch_id, created_by FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (!(await canAccessStudent(req.admin, studentRes.rows[0]))) {
      return res.status(403).json({ error: 'No access to this student' });
    }

    const result = await pool.query(
      `UPDATE students SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        parent_phone = COALESCE($5, parent_phone)
       WHERE id = $6
       RETURNING id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at, created_by`,
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
    const studentRes = await pool.query('SELECT batch_id, created_by FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (!(await canAccessStudent(req.admin, studentRes.rows[0]))) {
      return res.status(403).json({ error: 'No access to this student' });
    }

    await pool.query('DELETE FROM students WHERE id = $1', [studentId]);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Blacklist / unblacklist a student
async function setBlacklist(req, res) {
  const { studentId } = req.params;
  const { blacklisted } = req.body; // true/false

  if (typeof blacklisted !== 'boolean') {
    return res.status(400).json({ error: 'blacklisted (boolean) is required' });
  }

  try {
    const studentRes = await pool.query('SELECT batch_id, created_by FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (!(await canAccessStudent(req.admin, studentRes.rows[0]))) {
      return res.status(403).json({ error: 'No access to this student' });
    }

    const result = await pool.query(
      `UPDATE students SET is_blacklisted = $1 WHERE id = $2
       RETURNING id, batch_id, urn, first_name, last_name, phone, email, parent_phone, is_blacklisted, login_id, created_at, created_by`,
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
    const studentRes = await pool.query('SELECT batch_id, created_by FROM students WHERE id = $1', [studentId]);
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (!(await canAccessStudent(req.admin, studentRes.rows[0]))) {
      return res.status(403).json({ error: 'No access to this student' });
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

module.exports = {
  addStudent,
  listStudents,
  listMyStudents,
  updateStudent,
  deleteStudent,
  setBlacklist,
  setStudentCredentials,
  getStudentById,
};