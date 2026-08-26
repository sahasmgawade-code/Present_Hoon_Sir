const express = require('express');
const router = express.Router();
const {
  generateSession,
  getSessionStatus,
  submitAttendance,
  getSessionReport,
  downloadSessionReport,
} = require('../controllers/qrController');
const { verifyAdminOrFaculty } = require('../middleware/auth');

// Admin or Faculty (auth required)
router.post('/batch/:batchId/generate', verifyAdminOrFaculty, generateSession);
router.get('/:sessionId/report', verifyAdminOrFaculty, getSessionReport);
router.get('/:sessionId/download', verifyAdminOrFaculty, downloadSessionReport);
// Public (student-facing scan page — no auth)
router.get('/:token/status', getSessionStatus);
router.post('/:token/submit', submitAttendance);

module.exports = router;