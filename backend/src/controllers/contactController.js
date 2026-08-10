const resend = require('../utils/mailer');

async function submitContactForm(req, res) {
  const { name, email, phone, organization, message } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }

  try {
    await resend.emails.send({
      from: 'PHS-AMS Contact Form <onboarding@resend.dev>',
      to: process.env.CONTACT_RECEIVER_EMAIL,
      replyTo: email,
      subject: `New Contact Enquiry from ${name}`,
      html: `
        <h2>New Contact Us Submission — PHS-AMS</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Organization:</strong> ${organization || '-'}</p>
        <p><strong>Message:</strong></p>
        <p>${(message || '-').replace(/\n/g, '<br/>')}</p>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Contact form email error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
}

module.exports = { submitContactForm };