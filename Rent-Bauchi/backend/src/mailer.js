const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || "Rent Bauchi <no-reply@rentbauchi.test>";
const APP_URL = process.env.APP_URL || "http://localhost:5000";

function isConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!transporter && isConfigured()) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    // Demo mode: log instead of sending.
    console.log("[mailer:demo] To:", to, "| Subject:", subject);
    console.log("[mailer:demo] Body:", text || html);
    return { demo: true };
  }
  return getTransporter().sendMail({ from: MAIL_FROM, to, subject, text, html });
}

async function sendPasswordReset(email, token) {
  const link = `${APP_URL}/forgot-password.html?step=2&token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: "Reset your Rent Bauchi password",
    text: `Use this reset link within 1 hour: ${link}\n\nOr copy the token: ${token}`,
    html: `<p>Use the link below to reset your Rent Bauchi password (valid for 1 hour):</p>
      <p><a href="${link}">Reset your password</a></p>
      <p>Or copy this token: <code>${token}</code></p>`,
  });
}

module.exports = { sendMail, sendPasswordReset, isConfigured };
