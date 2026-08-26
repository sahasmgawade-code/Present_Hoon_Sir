const express = require('express');
const router = express.Router();
const { verifyFacultyToken } = require('../middleware/auth');
const {
  facultyLogin,
  changeFacultyPassword,
  verifyFacultyResetToken,
  setFacultyPassword,
} = require('../controllers/facultyAuthController');

router.post('/login', facultyLogin);
router.get('/verify-reset-token/:token', verifyFacultyResetToken);
router.post('/set-password', setFacultyPassword);
router.post('/change-password', verifyFacultyToken, changeFacultyPassword);

module.exports = router;