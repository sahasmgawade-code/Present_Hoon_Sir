const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const token = req.cookies.phsams_token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'student') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    req.student = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function verifyFacultyToken(req, res, next) {
  const token = req.cookies.phsams_faculty_token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'faculty') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    req.faculty = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function verifyAdminOrFaculty(req, res, next) {
  const token = req.cookies.phsams_faculty_token || req.cookies.phsams_token;
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'faculty') {
      req.faculty = decoded;
      req.actor = { id: decoded.id, type: 'faculty', role: 'faculty' };
    } else if (decoded.type === 'student') {
      return res.status(403).json({ error: 'Invalid token type' });
    } else {
      req.admin = decoded;
      req.actor = { id: decoded.id, type: 'admin', role: decoded.role };
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken, requireRole, verifyStudentToken, verifyFacultyToken, verifyAdminOrFaculty };