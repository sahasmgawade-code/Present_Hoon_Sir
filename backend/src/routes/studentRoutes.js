const express = require('express');
const router = express.Router();
const {
  addStudent,
  listStudents,
  updateStudent,
  deleteStudent,
  setBlacklist,
  setStudentCredentials,
} = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);

router.get('/batch/:batchId', listStudents);
router.post('/batch/:batchId', addStudent);
router.put('/:studentId', updateStudent);
router.delete('/:studentId', deleteStudent);
router.patch('/:studentId/blacklist', requireRole('super_admin', 'admin'), setBlacklist);
router.patch('/:studentId/credentials', setStudentCredentials);

module.exports = router;