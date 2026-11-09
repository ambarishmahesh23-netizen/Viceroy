import nodemailer from "nodemailer";

async function sendEmail({ to, subject, text, html }) {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim().replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn("[EMAIL SKIPPED] EMAIL_USER or EMAIL_PASS not configured in .env");
    return { skipped: true, reason: "Missing credentials" };
  }

  const isOAuthValid =
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    !process.env.GOOGLE_REFRESH_TOKEN.startsWith("http");

  let transporter;

  if (isOAuthValid) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user,
        clientId: process.env.GOOGLE_CLIENT_ID?.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim(),
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN?.trim(),
      },
    });
  } else {
    // Gmail with App Password using standard service definition & relaxed TLS for local dev
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  const sender =
    process.env.EMAIL_FROM?.trim() || `"Viceroy Resort & Residences" <${user}>`;

  // Dispatch the email
  try {
    const info = await transporter.sendMail({
      from: sender,
      to: to.trim(),
      subject,
      text,
      html,
    });

    console.log(
      `[EMAIL DISPATCHED] Successfully sent email to ${to} (MessageId: ${info.messageId})`
    );
    return info;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

export default sendEmail;
