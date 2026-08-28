const express = require('express');
const router = express.Router();
const { login, changePassword, verifyResetToken, setPassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
router.post('/login', login);
router.post('/change-password', verifyToken, changePassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/set-password', setPassword);
module.exports = router;