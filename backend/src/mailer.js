const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || "Rent Bauchi <no-reply@rentbauchi.test>";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || "Rent Bauchi";

function smtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}
function brevoConfigured() {
  return Boolean(BREVO_API_KEY && BREVO_FROM_EMAIL);
}
function isConfigured() {
  return smtpConfigured() || brevoConfigured();
}

let transporter = null;
function getTransporter() {
  if (!transporter && smtpConfigured()) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

async function sendBrevo({ to, subject, text, html }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: BREVO_FROM_EMAIL, name: BREVO_FROM_NAME },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo email failed (${res.status}): ${body}`);
  }
  return { ok: true };
}

async function sendMail({ to, subject, text, html }) {
  if (smtpConfigured()) {
    return getTransporter().sendMail({ from: MAIL_FROM, to, subject, text, html });
  }
  if (brevoConfigured()) {
    return sendBrevo({ to, subject, text, html });
  }
  // Demo mode: log instead of sending.
  console.log("[mailer:demo] To:", to, "| Subject:", subject);
  console.log("[mailer:demo] Body:", text || html);
  return { demo: true };
}

async function sendPasswordReset(email, code) {
  await sendMail({
    to: email,
    subject: "Reset your Rent Bauchi password",
    text: `Your Rent Bauchi password reset code is: ${code}\n\nEnter this 6-digit code on the reset page. It expires in 1 hour.`,
    html: `<p>Your Rent Bauchi password reset code is:</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700;color:#0E314D;">${code}</p>
      <p>Enter this 6-digit code on the password reset page. It is valid for 1 hour.</p>`,
  });
}

module.exports = { sendMail, sendPasswordReset, isConfigured };