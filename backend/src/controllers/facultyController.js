const crypto = require('crypto');
const pool = require('../config/db');
const { sendEmail } = require('../utils/mailer');
const { escapeHtml } = require('../utils/htmlEscape');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const RESET_TOKEN_TTL_HOURS = 24;

// Any authenticated admin can create a faculty. The creating admin is
// automatically able to see/manage it; optional collaboratorIds (other
// admins) can also be granted visibility at creation time — same pattern
// as batch creation.
async function createFaculty(req, res) {
  const { name, email, collaboratorIds } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const existing = await pool.query('SELECT id FROM faculties WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO faculties (name, email, password_hash, created_by, password_reset_token, password_reset_expires)
       VALUES ($1, $2, NULL, $3, $4, $5)
       RETURNING id, name, email, is_active, created_at`,
      [name, email, req.admin.id, resetToken, resetExpires]
    );
    const faculty = result.rows[0];

    // creator always has visibility
    await pool.query(
      `INSERT INTO faculty_admins (faculty_id, admin_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [faculty.id, req.admin.id]
    );

    if (Array.isArray(collaboratorIds) && collaboratorIds.length > 0) {
      const uniqueIds = [...new Set(collaboratorIds)].filter(
        (id) => Number.isInteger(id) && id !== req.admin.id
      );
      for (const adminId of uniqueIds) {
        await pool.query(
          `INSERT INTO faculty_admins (faculty_id, admin_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [faculty.id, adminId]
        );
      }
    }

    const setPasswordUrl = `${FRONTEND_URL}/faculty/set-password/${resetToken}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Your PHS-AMS faculty account has been created',
        html: `
          <h2>Welcome to PHS-AMS</h2>
          <p>Hi ${escapeHtml(name)},</p>
          <p>A faculty account has been created for you on the PHS Attendance Management System.</p>
          <p>Click the link below to create your password and log in:</p>
          <p><a href="${setPasswordUrl}">${setPasswordUrl}</a></p>
          <p>This link expires in ${RESET_TOKEN_TTL_HOURS} hours.</p>
        `,
      });
    } catch (mailErr) {
      console.error('Failed to send faculty invite email:', mailErr.message);
      return res.status(201).json({
        faculty,
        warning: 'Faculty created, but the invite email could not be sent.',
      });
    }

    res.status(201).json({ faculty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// List faculties visible to the current admin: super_admin sees all,
// regular admin sees only those they created or were added to as a collaborator.
async function listFaculties(req, res) {
  try {
    let result;
    if (req.admin.role === 'super_admin') {
      result = await pool.query(
        `SELECT f.id, f.name, f.email, f.is_active, f.created_by, f.created_at,
                a.name AS created_by_name
         FROM faculties f
         LEFT JOIN admins a ON a.id = f.created_by
         ORDER BY f.id`
      );
    } else {
      result = await pool.query(
        `SELECT f.id, f.name, f.email, f.is_active, f.created_by, f.created_at,
                a.name AS created_by_name
         FROM faculties f
         JOIN faculty_admins fa ON fa.faculty_id = f.id
         LEFT JOIN admins a ON a.id = f.created_by
         WHERE fa.admin_id = $1
         ORDER BY f.id`,
        [req.admin.id]
      );
    }
    res.json({ faculties: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function canManageFaculty(admin, facultyId) {
  if (admin.role === 'super_admin') return true;
  const result = await pool.query(
    'SELECT 1 FROM faculty_admins WHERE faculty_id = $1 AND admin_id = $2',
    [facultyId, admin.id]
  );
  return result.rows.length > 0;
}

// Rename a faculty
async function updateFaculty(req, res) {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    if (!(await canManageFaculty(req.admin, id))) {
      return res.status(403).json({ error: 'No access to this faculty' });
    }

    const result = await pool.query(
      'UPDATE faculties SET name = $1 WHERE id = $2 RETURNING id, name, email, is_active',
      [name.trim(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Faculty not found' });

    res.json({ faculty: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Activate/deactivate a faculty (deactivated faculty cannot log in)
async function toggleFacultyActive(req, res) {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive (boolean) is required' });
  }

  try {
    if (!(await canManageFaculty(req.admin, id))) {
      return res.status(403).json({ error: 'No access to this faculty' });
    }

    const result = await pool.query(
      'UPDATE faculties SET is_active = $1 WHERE id = $2 RETURNING id, name, email, is_active',
      [isActive, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Faculty not found' });

    res.json({ faculty: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Permanently delete a faculty — super_admin, or an admin who can manage it
async function deleteFaculty(req, res) {
  const { id } = req.params;
  try {
    if (!(await canManageFaculty(req.admin, id))) {
      return res.status(403).json({ error: 'No access to this faculty' });
    }

    const result = await pool.query('DELETE FROM faculties WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Faculty not found' });

    res.json({ message: 'Faculty deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Add a collaborating admin to a faculty (grants them visibility/management)
async function addFacultyCollaborator(req, res) {
  const { id } = req.params; // faculty id
  const { adminId } = req.body;

  if (!adminId) return res.status(400).json({ error: 'adminId is required' });

  try {
    if (!(await canManageFaculty(req.admin, id))) {
      return res.status(403).json({ error: 'No access to this faculty' });
    }

    const admin = await pool.query('SELECT id FROM admins WHERE id = $1', [adminId]);
    if (admin.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    await pool.query(
      `INSERT INTO faculty_admins (faculty_id, admin_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, adminId]
    );

    res.json({ message: 'Collaborator added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Remove a collaborating admin from a faculty
async function removeFacultyCollaborator(req, res) {
  const { id, adminId } = req.params;

  try {
    if (!(await canManageFaculty(req.admin, id))) {
      return res.status(403).json({ error: 'No access to this faculty' });
    }

    const facultyRes = await pool.query('SELECT created_by FROM faculties WHERE id = $1', [id]);
    if (facultyRes.rows.length === 0) return res.status(404).json({ error: 'Faculty not found' });
    if (Number(adminId) === facultyRes.rows[0].created_by) {
      return res.status(403).json({ error: 'Cannot remove the admin who created this faculty' });
    }

    const result = await pool.query(
      'DELETE FROM faculty_admins WHERE faculty_id = $1 AND admin_id = $2 RETURNING *',
      [id, adminId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'That admin does not have access to this faculty' });
    }

    res.json({ message: 'Collaborator removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// List every batch with a flag for whether this faculty has access — used by
// the "assign batches" picker on the faculty's admin-side settings page
async function getFacultyBatchAccess(req, res) {
  const { id } = req.params; // faculty id
  try {
    if (!(await canManageFaculty(req.admin, id))) {
      return res.status(403).json({ error: 'No access to this faculty' });
    }

    const result = await pool.query(
      `SELECT b.id, b.name,
              EXISTS (
                SELECT 1 FROM faculty_batches fb
                WHERE fb.batch_id = b.id AND fb.faculty_id = $1
              ) AS "hasAccess"
       FROM batches b
       WHERE b.is_archived = FALSE
       ORDER BY b.id`,
      [id]
    );

    res.json({ batches: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Grant a faculty access to a batch
async function assignBatchToFaculty(req, res) {
  const { id } = req.params; // faculty id
  const { batchId } = req.body;

  if (!batchId) return res.status(400).json({ error: 'batchId is required' });

  try {
    if (!(await canManageFaculty(req.admin, id))) {
      return res.status(403).json({ error: 'No access to this faculty' });
    }

    const batch = await pool.query('SELECT id FROM batches WHERE id = $1', [batchId]);
    if (batch.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });

    await pool.query(
      `INSERT INTO faculty_batches (faculty_id, batch_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, batchId]
    );

    res.json({ message: 'Batch assigned to faculty' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Revoke a faculty's access to a batch
async function revokeBatchFromFaculty(req, res) {
  const { id, batchId } = req.params; // faculty id, batch id

  try {
    if (!(await canManageFaculty(req.admin, id))) {
      return res.status(403).json({ error: 'No access to this faculty' });
    }

    const result = await pool.query(
      'DELETE FROM faculty_batches WHERE faculty_id = $1 AND batch_id = $2 RETURNING *',
      [id, batchId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty does not have access to this batch' });
    }

    res.json({ message: 'Batch access revoked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  createFaculty,
  listFaculties,
  updateFaculty,
  toggleFacultyActive,
  deleteFaculty,
  addFacultyCollaborator,
  removeFacultyCollaborator,
  getFacultyBatchAccess,
  assignBatchToFaculty,
  revokeBatchFromFaculty,
};