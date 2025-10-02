// src/config/mailer.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log('Nodemailer Config:', {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS ? '[REDACTED]' : undefined,
});

transporter.verify((error, success) => {
});

export default transporter;