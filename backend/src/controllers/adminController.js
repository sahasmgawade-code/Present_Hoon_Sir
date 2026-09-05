const crypto = require('crypto');
const pool = require('../config/db');
const { sendEmail } = require('../utils/mailer');
const { escapeHtml } = require('../utils/htmlEscape');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const RESET_TOKEN_TTL_HOURS = 24;

async function createAdmin(req, res) {
  const { name, email, role } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const resolvedRole = role === 'super_admin' ? 'super_admin' : 'admin';
  try {
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);
    const result = await pool.query(
      `INSERT INTO admins (name, email, password_hash, role, password_reset_token, password_reset_expires)
       VALUES ($1, $2, NULL, $3, $4, $5)
       RETURNING id, name, email, role, email_notifications_enabled, sms_notifications_enabled, created_at`,
      [name, email, resolvedRole, resetToken, resetExpires]
    );
    const admin = result.rows[0];
    const setPasswordUrl = `${FRONTEND_URL}/set-password/${resetToken}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Your PHS-AMS admin account has been created',
        html: `
          <h2>Welcome to PHS-AMS</h2>
          <p>Hi ${escapeHtml(name)},</p>
          <p>An admin account has been created for you on the PHS Attendance Management System.</p>
          <p>Click the link below to create your password and log in:</p>
          <p><a href="${setPasswordUrl}">${setPasswordUrl}</a></p>
          <p>This link expires in ${RESET_TOKEN_TTL_HOURS} hours.</p>
        `,
      });
    } catch (mailErr) {
      console.error('Failed to send admin invite email:', mailErr.message);
      return res.status(201).json({
        admin,
        warning: 'Admin created, but the invite email could not be sent.',
      });
    }
    res.status(201).json({ admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listAdmins(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, email_notifications_enabled, sms_notifications_enabled, created_at
       FROM admins ORDER BY id`
    );
    res.json({ admins: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listAdminsBasic(req, res) {
  try {
    const result = await pool.query('SELECT id, name FROM admins ORDER BY name');
    res.json({ admins: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getOwnProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, email_notifications_enabled, sms_notifications_enabled
       FROM admins WHERE id = $1`,
      [req.admin.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getAdminBatchAccess(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT b.id, b.name,
              EXISTS (
                SELECT 1 FROM batch_admins ba
                WHERE ba.batch_id = b.id AND ba.admin_id = $1
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

async function updateAdmin(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE admins SET name = $1 WHERE id = $2 RETURNING id, name, email, role',
      [name.trim(), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function deleteAdmin(req, res) {
  const { id } = req.params;
  if (Number(id) === req.admin.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  try {
    const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json({ message: 'Admin deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function toggleEmailNotifications(req, res) {
  const { id } = req.params;
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE admins SET email_notifications_enabled = $1 WHERE id = $2 RETURNING id, email_notifications_enabled',
      [enabled, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function toggleSmsNotifications(req, res) {
  const { id } = req.params;
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  }
  try {
    const result = await pool.query(
      'UPDATE admins SET sms_notifications_enabled = $1 WHERE id = $2 RETURNING id, sms_notifications_enabled',
      [enabled, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  createAdmin,
  updateAdmin,
  deleteAdmin,
  listAdmins,
  listAdminsBasic,
  getAdminBatchAccess,
  toggleEmailNotifications,
  toggleSmsNotifications,
  getOwnProfile,
};