const dotenv = require("dotenv");
dotenv.config();
const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "0", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const missing = [];
  if (!host) missing.push("SMTP_HOST");
  if (!port) missing.push("SMTP_PORT");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");

  if (missing.length) {
    const err = new Error(`SMTP configuration missing: ${missing.join(", ")}`);
    err.code = "NO_SMTP_CONFIG";
    console.error(err.message);
    throw err;
  }

  const connectionTimeout = parseInt(process.env.SMTP_CONN_TIMEOUT || "10000", 10);
  const greetingTimeout = parseInt(process.env.SMTP_GREETING_TIMEOUT || "5000", 10);
  const socketTimeout = parseInt(process.env.SMTP_SOCKET_TIMEOUT || "10000", 10);

  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false" },
  });

  // Verify connection in background and log a succinct message if it fails.
  transporter.verify().then(() => {
    console.log("SMTP: connection verified");
  }).catch((err) => {
    console.error("SMTP verify failed:", err && err.message ? err.message : err);
  });

  return transporter;
}

async function sendEmail(to, subject, text) {
  try {
    const fromAddress = process.env.SMTP_FROM;
    if (!fromAddress) throw new Error("SMTP_FROM is missing");

    const t = getTransporter();

    const info = await t.sendMail({ from: fromAddress, to, subject, text });

    console.log("Email sent:", info.messageId);
    return { ok: true, id: info.messageId };
  } catch (err) {
    console.error("Email error:", err && err.message ? err.message : err);
    const e = new Error("Mail provider error");
    e.code = "MAIL_SEND_FAILED";
    e.detail = err && err.message ? err.message : String(err);
    throw e;
  }
}

// Expose a small test helper so you can verify SMTP connectivity from the server:
sendEmail.test = async function testSmtp() {
  const t = getTransporter();
  await t.verify();
  return true;
};

module.exports = sendEmail;
