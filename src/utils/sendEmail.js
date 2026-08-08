// Sends email via Resend's HTTPS API instead of raw SMTP sockets.
// This matters because Railway (and most cloud hosts) block outbound SMTP
// ports (465/587) by default, regardless of domain ownership - HTTPS on
// port 443 is never blocked, since it's the same kind of request your app
// already makes successfully to MongoDB Atlas and Cloudinary.
//
// Now that you own luxejewels.dpdns.org and have verified it in Resend,
// RESEND_FROM_EMAIL should be an address on that domain (e.g.
// hello@luxejewels.dpdns.org) - this removes the "can only send to your
// own inbox" restriction that onboarding@resend.dev has.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Luxe Jewels <onboarding@resend.dev>';

const sendViaResend = async ({ to, subject, html }) => {
  if (!RESEND_API_KEY) {
    const err = new Error('Email is not configured on this server (missing RESEND_API_KEY).');
    err.statusCode = 503;
    throw err;
  }

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
// Resend's `to` field accepts an array directly - batching just keeps each
// request comfortably under rate limits on the free tier.
const sendBulkEmail = async ({ recipients, subject, html, batchSize = 40 }) => {
  const results = { sent: 0, failed: 0 };
  const unique = [...new Set(recipients.filter(Boolean))];

  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
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
