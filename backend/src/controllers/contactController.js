const { apiInstance, SibApiV3Sdk } = require('../utils/mailer');
async function submitContactForm(req, res) {
  const { name, email, phone, organization, message } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }

  try {
    const mail = new SibApiV3Sdk.SendSmtpEmail();
    mail.sender = { email: process.env.BREVO_SENDER_EMAIL, name: 'PHS-AMS Contact Form' };
    mail.to = [{ email: process.env.CONTACT_RECEIVER_EMAIL }];
    mail.replyTo = { email };
    mail.subject = `New Contact Enquiry from ${name}`;
    mail.htmlContent = `
      <h2>New Contact Us Submission — PHS-AMS</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Organization:</strong> ${organization || '-'}</p>
      <p><strong>Message:</strong></p>
      <p>${(message || '-').replace(/\n/g, '<br/>')}</p>
    `;

    await apiInstance.sendTransacEmail(mail);

    res.json({ success: true });
  } catch (err) {
    console.error('Contact form email error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
}

module.exports = { submitContactForm };