const dotenv = require("dotenv");
dotenv.config();

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function sendEmail(to, subject, text) {
  try {
    const result = await resend.emails.send({
      from: "Campus Vibe <onboarding@resend.dev>",
      to,
      subject,
      text,
    });

    console.log("Email sent:", result?.data?.id || "No ID returned");
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
};
