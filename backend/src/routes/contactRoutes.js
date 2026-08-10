const express = require('express');
const router = express.Router();
const { submitContactForm } = require('../controllers/contactController');

// Public — no auth, this is the marketing page contact form
router.post('/', submitContactForm);

module.exports = router;