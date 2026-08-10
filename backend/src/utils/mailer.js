const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4 resolution first — avoids ENETUNREACH on hosts without IPv6 egress (e.g. Render)
dns.setDefaultResultOrder('ipv4first');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

module.exports = { transporter };