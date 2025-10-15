import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text }) => {
  // Validate input
  if (!to || !subject || !text) {
    throw new Error('Missing email parameters');
  }

  // Ensure environment variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Missing email credentials');
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'gmail' for Gmail; adjust for other providers (e.g., 'sendgrid')
    auth: {
      user: process.env.EMAIL_USER, // e.g., 'your-email@gmail.com'
      pass: process.env.EMAIL_PASS // App Password for Gmail
    }
  });

  // Email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

export default sendEmail;
