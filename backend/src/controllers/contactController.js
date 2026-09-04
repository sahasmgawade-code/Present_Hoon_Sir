const { sendEmail } = require('../utils/mailer');
const { escapeHtml } = require('../utils/htmlEscape');
async function submitContactForm(req, res) {
  const { name, email, phone, organization, message } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }
  if (!/^[A-Za-z\s.'-]+$/.test(name.trim())) {
    return res.status(400).json({ error: 'Name should not contain numbers or special characters' });
  }
  if (!/^\+\d{1,4}\s?\d{6,15}$/.test(phone.trim())) {
    return res.status(400).json({ error: 'Please provide a valid phone number' });
  }
  try {
    await sendEmail({
      to: process.env.CONTACT_RECEIVER_EMAIL,
      subject: `New Contact Enquiry from ${name}`,
      html: `
        <h2>New Contact Us Submission — PHS-AMS</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Organization:</strong> ${escapeHtml(organization || '-')}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message || '-').replace(/\n/g, '<br/>')}</p>
      `,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Contact form email error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
}
module.exports = { submitContactForm };