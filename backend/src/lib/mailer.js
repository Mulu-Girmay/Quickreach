const nodemailer = require("nodemailer");

// Lazily-created transporter so the module can be imported in tests without
// crashing when SMTP env vars are absent.
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // email silently skipped when not configured
  }

  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return _transporter;
};

const FROM = () =>
  process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@quickreach.local";

const sendDispatcherWelcome = async ({ name, email, temporaryPassword, createdBy }) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      `[mailer] SMTP not configured — skipping welcome email to ${email}. ` +
        "Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable emails.",
    );
    return { skipped: true };
  }

  await transporter.sendMail({
    from: `"QuickReach Operations" <${FROM()}>`,
    to: email,
    subject: "Your QuickReach Dispatcher Account",
    text: [
      `Hi ${name},`,
      "",
      `A dispatcher account has been created for you on QuickReach by ${createdBy}.`,
      "",
      `  Email:             ${email}`,
      `  Temporary password: ${temporaryPassword}`,
      "",
      "Please log in and change your password immediately.",
      "",
      "— QuickReach Operations",
    ].join("\n"),
    html: `
      <p>Hi <strong>${name}</strong>,</p>
      <p>A dispatcher account has been created for you on <strong>QuickReach</strong> by <em>${createdBy}</em>.</p>
      <table cellpadding="6" style="border-collapse:collapse;font-family:monospace">
        <tr><td><strong>Email</strong></td><td>${email}</td></tr>
        <tr><td><strong>Temporary password</strong></td><td>${temporaryPassword}</td></tr>
      </table>
      <p>Please log in and change your password immediately.</p>
      <p>— QuickReach Operations</p>
    `,
  });

  return { sent: true };
};

module.exports = { sendDispatcherWelcome };
