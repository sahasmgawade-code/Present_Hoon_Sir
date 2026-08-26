const express = require('express');
const router = express.Router();
const {
  studentLogin,
  getMyAttendance,
  getMyAssignments,
  submitAssignment,
} = require('../controllers/studentAuthController');
const { verifyStudentToken } = require('../middleware/auth');
const { uploadSubmissionFile } = require('../middleware/upload');

// Public — student login
router.post('/login', studentLogin);

// Protected — student's own batch + attendance
router.get('/me', verifyStudentToken, getMyAttendance);

// Protected — assignments for the student's own batch, and submitting work
router.get('/assignments', verifyStudentToken, getMyAssignments);
router.post('/assignments/:assignmentId/submit', verifyStudentToken, uploadSubmissionFile, submitAssignment);

module.exports = router;