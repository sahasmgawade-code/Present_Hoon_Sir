const express = require('express');
const router = express.Router();
const { getAttendanceForDate, saveAttendanceForDate } = require('../controllers/attendanceController');
const { verifyAdminOrFaculty } = require('../middleware/auth');

router.use(verifyAdminOrFaculty);

router.get('/batch/:batchId', getAttendanceForDate);
router.post('/batch/:batchId', saveAttendanceForDate);

module.exports = router;