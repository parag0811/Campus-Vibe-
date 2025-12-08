const dotenv = require("dotenv");
dotenv.config();
const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.error("SMTP ERROR:", err);

    const err = new Error("SMTP configuration missing.");
    err.code = "NO_SMTP_CONFIG";
    throw err;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Brevo = false
    auth: { user, pass },
  });

  return transporter;
}

module.exports = async function sendEmail(to, subject, text) {
  try {
    const fromAddress = process.env.SMTP_FROM;
    if (!fromAddress) throw new Error("SMTP_FROM is missing");

    console.log("Using FROM:", fromAddress);
    console.log("Using USER:", process.env.SMTP_USER);

    const t = getTransporter();

    const info = await t.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
    });

    console.log("Email sent:", info.messageId);
    console.log({
      HOST: process.env.SMTP_HOST,
      PORT: process.env.SMTP_PORT,
      USER: process.env.SMTP_USER,
      FROM: process.env.SMTP_FROM,
    });

    return { ok: true, id: info.messageId };
  } catch (err) {
    console.error("Email error:", err.message);
    const e = new Error("Mail provider error");
    e.code = "MAIL_SEND_FAILED";
    e.detail = err.message;
    throw e;
  }
};
