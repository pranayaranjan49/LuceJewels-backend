// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: Number(process.env.SMTP_PORT),
//   secure: Number(process.env.SMTP_PORT) === 465,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// /**
//  * sendEmail({ to, subject, html })
//  * to: string | string[]  (string[] used for bulk campaign sends)
//  */
// const sendEmail = async ({ to, subject, html }) => {
//   const info = await transporter.sendMail({
//     from: process.env.SMTP_FROM,
//     to,
//     subject,
//     html,
//   });
//   return info;
// };

// // Sends the same email to many recipients in batches (avoids provider throttling/spam flags)
// const sendBulkEmail = async ({ recipients, subject, html, batchSize = 40 }) => {
//   const results = { sent: 0, failed: 0 };
//   for (let i = 0; i < recipients.length; i += batchSize) {
//     const batch = recipients.slice(i, i + batchSize);
//     try {
//       await transporter.sendMail({
//         from: process.env.SMTP_FROM,
//         bcc: batch, // bcc keeps recipient list private
//         subject,
//         html,
//       });
//       results.sent += batch.length;
//     } catch (err) {
//       console.error('Bulk email batch failed:', err.message);
//       results.failed += batch.length;
//     }
//   }
//   return results;
// };

// module.exports = { sendEmail, sendBulkEmail };



// Sends email via Resend's HTTPS API instead of raw SMTP sockets.
// This matters because Railway (and most cloud hosts) block outbound SMTP
// ports (465/587) by default - HTTPS on port 443 is never blocked, since
// it's the same kind of request your app already makes to MongoDB Atlas
// and Cloudinary successfully.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// onboarding@resend.dev works immediately with zero domain setup and can
// send to any recipient - perfect for launch day. Once you own a domain
// you can verify it in Resend and switch this to your own address.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Luxe Jewels <onboarding@resend.dev>';

const sendViaResend = async ({ to, subject, html }) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend error (${res.status}): ${errText || 'send failed'}`);
  }
  return res.json();
};

/**
 * sendEmail({ to, subject, html })
 */
const sendEmail = async ({ to, subject, html }) => {
  return sendViaResend({ to, subject, html });
};

// Sends the same email to many recipients in batches (campaign broadcasts).
// Resend's `to` field accepts an array directly, so no bcc trick needed -
// but we still batch to stay well under rate limits on the free tier.
const sendBulkEmail = async ({ recipients, subject, html, batchSize = 40 }) => {
  const results = { sent: 0, failed: 0 };
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    try {
      await sendViaResend({ to: batch, subject, html });
      results.sent += batch.length;
    } catch (err) {
      console.error('Bulk email batch failed:', err.message);
      results.failed += batch.length;
    }
  }
  return results;
};

module.exports = { sendEmail, sendBulkEmail };