const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS,
  },
});

/**
 * Verify Gmail SMTP connection at application startup
 * Safely checks credentials without crashing the application
 */
const verifyTransporter = async () => {
  if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASS) {
    console.warn('⚠️  [Gmail SMTP Warning]: NODEMAILER_EMAIL and/or NODEMAILER_PASS environment variables are missing.');
    return false;
  }

  try {
    await transporter.verify();
    console.log('✅ Gmail SMTP connection verified successfully.');
    return true;
  } catch (error) {
    // Log error message without exposing credentials
    console.error('❌ Gmail SMTP verification failed:', error.message);
    return false;
  }
};

/**
 * Send an email using the shared Gmail SMTP transporter
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASS) {
    const errorMsg = 'SMTP credentials not configured (NODEMAILER_EMAIL or NODEMAILER_PASS missing).';
    console.error(`[Email Send Error]: ${errorMsg}`);
    return { error: errorMsg };
  }

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    const errorMsg = `Invalid recipient email address: "${to}"`;
    console.error(`[Email Send Error]: ${errorMsg}`);
    return { error: errorMsg };
  }

  try {
    const fromAddress =
      process.env.EMAIL_FROM ||
      (process.env.NODEMAILER_EMAIL
        ? `"DOPtv Advertising" <${process.env.NODEMAILER_EMAIL}>`
        : '"DOPtv Advertising" <no-reply@doptv.ng>');

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (error) {
    console.error('[Email Send Error]:', error.message);
    return { error: error.message };
  }
};

// Attach helper functions so consumer files can import either transporter or { sendEmail, verifyTransporter }
transporter.sendEmail = sendEmail;
transporter.verifyTransporter = verifyTransporter;

module.exports = transporter;
