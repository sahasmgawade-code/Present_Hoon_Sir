const emailjs = require('@emailjs/nodejs');
emailjs.init({
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
});
async function sendEmail({ to, subject, html }) {
  return emailjs.send(process.env.EMAILJS_SERVICE_ID, process.env.EMAILJS_TEMPLATE_ID, {
    to_email: to,
    subject,
    message_html: html,
  });
}
module.exports = { sendEmail };