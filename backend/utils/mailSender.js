const nodemailer = require('nodemailer');
require('dotenv').config(); // 👈 Make sure this is FIRST

module.exports = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // or your SMTP
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: '"Campus Vibe" <noreply@yourapp.com>',
    to,
    subject,
    text,
  });
};
