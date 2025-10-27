const nodemailer = require("nodemailer");
require("dotenv").config();

module.exports = async function sendEmail(to, subject, text) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("EMAIL_USER/EMAIL_PASS are not set");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // 465 TLS
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from: user,
      to,
      subject,
      text,
    });
    console.log(`Mail sent ${info.messageId} -> ${to}`);
  } catch (err) {
    console.error("Nodemailer send failed:", err?.response || err?.message || err);
    throw err;
  }
}
