const express = require('express');
const router = express.Router();
const { getBatchReport, getStudentReport, getBatchAttendanceMatrix } = require('../controllers/reportController');
const { verifyToken } = require('../middleware/auth');
router.use(verifyToken);
router.get('/batch/:batchId', getBatchReport);
router.get('/batch/:batchId/matrix', getBatchAttendanceMatrix);
router.get('/student/:studentId', getStudentReport);
module.exports = router;