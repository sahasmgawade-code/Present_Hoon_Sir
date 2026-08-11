const express = require('express');
const router = express.Router();
const { studentLogin, getMyAttendance } = require('../controllers/studentAuthController');
const { verifyStudentToken } = require('../middleware/auth');

// Public — student login
router.post('/login', studentLogin);

// Protected — student's own batch + attendance
router.get('/me', verifyStudentToken, getMyAttendance);

module.exports = router;