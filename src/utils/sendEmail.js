const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * sendEmail({ to, subject, html })
 * to: string | string[]  (string[] used for bulk campaign sends)
 */
const sendEmail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
  return info;
};

// Sends the same email to many recipients in batches (avoids provider throttling/spam flags)
const sendBulkEmail = async ({ recipients, subject, html, batchSize = 40 }) => {
  const results = { sent: 0, failed: 0 };
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        bcc: batch, // bcc keeps recipient list private
        subject,
        html,
      });
      results.sent += batch.length;
    } catch (err) {
      console.error('Bulk email batch failed:', err.message);
      results.failed += batch.length;
    }
  }
  return results;
};

module.exports = { sendEmail, sendBulkEmail };
