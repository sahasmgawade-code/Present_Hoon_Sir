const rateLimit = require('express-rate-limit');

const make = (windowMs, max, error) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { error } });

const loginMsg = 'Too many login attempts. Please wait a few minutes and try again.';
const adminLoginLimiter   = make(15 * 60 * 1000, 8, loginMsg);
const facultyLoginLimiter = make(15 * 60 * 1000, 8, loginMsg);
const studentLoginLimiter = make(15 * 60 * 1000, 30, loginMsg); // classrooms share one Wi-Fi IP
const contactLimiter      = make(60 * 60 * 1000, 5, 'Too many messages sent. Please try again later.');
const qrSubmitLimiter     = make(10 * 60 * 1000, 200, 'Too many attempts. Please wait a few minutes.');

module.exports = { adminLoginLimiter, facultyLoginLimiter, studentLoginLimiter, contactLimiter, qrSubmitLimiter };