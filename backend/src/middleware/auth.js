const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // { id, role, name }
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

// Separate verifier for student portal tokens (different payload shape, no role)
function verifyStudentToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'student') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    req.student = decoded; // { studentId, batchId, type: 'student' }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Verifier for faculty portal tokens
function verifyFacultyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'faculty') {
      return res.status(403).json({ error: 'Invalid token type' });
    }
    req.faculty = decoded; // { id, type: 'faculty', name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Accepts EITHER an admin token OR a faculty token, and normalizes both into
// req.actor = { id, type: 'admin' | 'faculty', role } so shared endpoints
// (attendance, QR) can be used by both without duplicating logic.
function verifyAdminOrFaculty(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'faculty') {
      req.faculty = decoded;
      req.actor = { id: decoded.id, type: 'faculty', role: 'faculty' };
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