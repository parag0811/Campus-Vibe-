const dotenv = require("dotenv");
dotenv.config();

function initSib() {
  let SibApiV3Sdk;
  try {
    SibApiV3Sdk = require("sib-api-v3-sdk");
  } catch (err) {
    const e = new Error("Package 'sib-api-v3-sdk' not installed. Run 'npm install sib-api-v3-sdk' in backend/");
    e.code = "SIB_SDK_MISSING";
    throw e;
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  if (!defaultClient) {
    throw new Error("sib-api-v3-sdk default client not available");
  }

  const apiKey = defaultClient.authentications["api-key"];
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    const e = new Error("BREVO_API_KEY is missing");
    e.code = "NO_BREVO_KEY";
    throw e;
  }
  apiKey.apiKey = key;

  return { SibApiV3Sdk, api: new SibApiV3Sdk.TransactionalEmailsApi() };
}

async function sendEmail(to, subject, text) {
  try {
    const fromEmail = process.env.BREVO_FROM;
    const fromName = process.env.BREVO_FROM_NAME || "Campus Vibe";
    if (!fromEmail) throw new Error("BREVO_FROM is missing");

    const { SibApiV3Sdk, api } = initSib();

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: fromEmail, name: fromName };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;

    if (text && typeof text === "object" && text.html) {
      sendSmtpEmail.htmlContent = text.html;
      if (text.text) sendSmtpEmail.textContent = text.text;
    } else {
      sendSmtpEmail.textContent = String(text || "");
    }

    const resp = await api.sendTransacEmail(sendSmtpEmail);
    return { ok: true, id: resp && (resp.messageId || resp['messageId'] || null) };
  } catch (err) {
    const msg = err && err.body && err.body.message ? err.body.message : err && err.message ? err.message : String(err);
    console.error("Brevo (sib) email error:", msg);
    const e = new Error("Mail provider error");
    e.code = "MAIL_SEND_FAILED";
    e.detail = msg;
    throw e;
  }
}

sendEmail.test = async function testSib() {
  const recipient = process.env.BREVO_TEST_RECIPIENT;
  if (recipient) {
    return await sendEmail(recipient, "Brevo (sib) test", "This is a test email from Campus Vibe.");
  }
  if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY is missing");
  return true;
};

module.exports = sendEmail;
