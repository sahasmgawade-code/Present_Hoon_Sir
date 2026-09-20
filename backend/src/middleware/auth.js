const jwt = require('jsonwebtoken');
const pool = require('../config/db');
async function verifyToken(req, res, next) {
  const token = req.cookies.phsams_token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  let admin;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    // Faculty/student tokens use the same secret. Never accept them as admin.
    if (decoded.type || !decoded.id) {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    // Take the role from the DB so deleted or demoted admins lose access immediately
    const { rows } = await pool.query('SELECT id, name, role FROM admins WHERE id = $1', [decoded.id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }
    admin = rows[0];
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.admin = { id: admin.id, name: admin.name, role: admin.role };
  next();
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.admin || !allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function verifyStudentToken(req, res, next) {
  const token = req.cookies.phsams_student_token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.type !== 'student') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    req.student = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function verifyFacultyToken(req, res, next) {
  const token = req.cookies.phsams_faculty_token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  let faculty;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.type !== 'faculty') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    const { rows } = await pool.query('SELECT id, name, is_active FROM faculties WHERE id = $1', [decoded.id]);
    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({ error: 'Account is inactive or no longer exists' });
    }
    faculty = rows[0];
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.faculty = { id: faculty.id, name: faculty.name, type: 'faculty' };
  next();
}
async function verifyAdminOrFaculty(req, res, next) {
  const token = req.cookies.phsams_faculty_token || req.cookies.phsams_token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  let actor;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.type === 'faculty') {
      const { rows } = await pool.query('SELECT id, name, is_active FROM faculties WHERE id = $1', [decoded.id]);
      if (rows.length === 0 || !rows[0].is_active) {
        return res.status(401).json({ error: 'Account is inactive or no longer exists' });
      }
      actor = { id: rows[0].id, type: 'faculty', role: 'faculty', name: rows[0].name };
    } else if (!decoded.type && decoded.id) {
      const { rows } = await pool.query('SELECT id, name, role FROM admins WHERE id = $1', [decoded.id]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Account no longer exists' });
      }
      actor = { id: rows[0].id, type: 'admin', role: rows[0].role, name: rows[0].name };
    } else {
      return res.status(403).json({ error: 'Invalid token type' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.actor = { id: actor.id, type: actor.type, role: actor.role };
  if (actor.type === 'faculty') req.faculty = { id: actor.id, name: actor.name, type: 'faculty' };
  else req.admin = { id: actor.id, name: actor.name, role: actor.role };
  next();
}
module.exports = { verifyToken, requireRole, verifyStudentToken, verifyFacultyToken, verifyAdminOrFaculty };