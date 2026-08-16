const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendEmail } = require('../utils/mailer');
const { escapeHtml } = require('../utils/htmlEscape');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const RESET_TOKEN_TTL_HOURS = 24;

// Super Admin creates a new admin (role: 'admin').
// No password is collected here — an email is sent with a link
// so the new admin can create their own password.
async function createAdmin(req, res) {
  const { name, email, emailNotificationsEnabled, smsNotificationsEnabled } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const emailEnabled = emailNotificationsEnabled !== false;
  const smsEnabled = smsNotificationsEnabled !== false;

  try {
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO admins (name, email, password_hash, role, email_notifications_enabled, sms_notifications_enabled, password_reset_token, password_reset_expires)
       VALUES ($1, $2, NULL, 'admin', $3, $4, $5, $6)
       RETURNING id, name, email, role, email_notifications_enabled, sms_notifications_enabled`,
      [name, email, emailEnabled, smsEnabled, resetToken, resetExpires]
    );

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
        admin: result.rows[0],
        warning: 'Admin created, but the invite email could not be sent.',
      });
    }

    res.status(201).json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Any authenticated admin can view their own profile — used for the Settings page
async function getOwnProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, email_notifications_enabled, sms_notifications_enabled
       FROM admins WHERE id = $1`,
      [req.admin.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Super Admin renames any admin (including themself)
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
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Super Admin deletes an admin
async function deleteAdmin(req, res) {
  const { id } = req.params;

  try {
    const target = await pool.query('SELECT role FROM admins WHERE id = $1', [id]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    if (target.rows[0].role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete a super admin' });
    }
    if (Number(id) === req.admin.id) {
      return res.status(403).json({ error: 'You cannot delete your own account while logged in' });
    }

    await pool.query('DELETE FROM admins WHERE id = $1', [id]);
    res.json({ message: 'Admin deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// List all admins (super admin only)
async function listAdmins(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, email_notifications_enabled, sms_notifications_enabled, created_at FROM admins ORDER BY id'
    );
    res.json({ admins: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Minimal admin list (id, name, role) — any authenticated admin can call this,
// used to populate the "collaborate with" picker when creating a batch
async function listAdminsBasic(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, role FROM admins WHERE id != $1 ORDER BY name',
      [req.admin.id]
    );
    res.json({ admins: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// List every batch with a flag for whether this specific admin has access (super admin only)
async function getAdminBatchAccess(req, res) {
  const { id } = req.params; // admin id

  try {
    const admin = await pool.query('SELECT id FROM admins WHERE id = $1', [id]);
    if (admin.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    const result = await pool.query(
      `SELECT b.id, b.name,
              EXISTS (
                SELECT 1 FROM batch_admins ba
                WHERE ba.batch_id = b.id AND ba.admin_id = $1
              ) AS "hasAccess"
       FROM batches b
       ORDER BY b.id`,
      [id]
    );

    res.json({ batches: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
// Super Admin toggles whether an admin receives absentee email alerts
async function toggleEmailNotifications(req, res) {
  const { id } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE admins SET email_notifications_enabled = $1 WHERE id = $2 RETURNING id, name, email, role, email_notifications_enabled',
      [enabled, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Super Admin toggles whether an admin's actions trigger absentee SMS to parents
async function toggleSmsNotifications(req, res) {
  const { id } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) is required' });
  }

  try {
    const result = await pool.query(
      'UPDATE admins SET sms_notifications_enabled = $1 WHERE id = $2 RETURNING id, name, email, role, sms_notifications_enabled',
      [enabled, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    res.json({ admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createAdmin, updateAdmin, deleteAdmin, listAdmins, listAdminsBasic, getAdminBatchAccess, toggleEmailNotifications, toggleSmsNotifications, getOwnProfile };