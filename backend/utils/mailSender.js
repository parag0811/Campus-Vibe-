const dotenv = require("dotenv");
dotenv.config();

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function sendEmail(to, subject, text) {
  try {
    const data = await resend.emails.send({
      from: "Campus Vibe <noreply@campusvibe.app>",
      to,
      subject,
      text,
    });

    console.log("Email sent:", data.id);
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
};

