// const twilio = require('twilio');

// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// // Uses Twilio Verify service - handles OTP generation/expiry/attempts for you
// const sendOtpSms = async (phone) => {
//   return client.verify.v2
//     .services(process.env.TWILIO_VERIFY_SERVICE_SID)
//     .verifications.create({ to: phone, channel: 'sms' });
// };

// const checkOtpSms = async (phone, code) => {
//   return client.verify.v2
//     .services(process.env.TWILIO_VERIFY_SERVICE_SID)
//     .verificationChecks.create({ to: phone, code });
// };

// // Plain SMS for campaign broadcasts (not OTP)
// const sendPlainSms = async (to, body) => {
//   return client.messages.create({
//     body,
//     from: process.env.TWILIO_PHONE_NUMBER,
//     to,
//   });
// };

// const sendBulkSms = async (recipients, body) => {
//   const results = { sent: 0, failed: 0 };
//   for (const to of recipients) {
//     try {
//       await sendPlainSms(to, body);
//       results.sent += 1;
//     } catch (err) {
//       results.failed += 1;
//     }
//   }
//   return results;
// };

// module.exports = { sendOtpSms, checkOtpSms, sendPlainSms, sendBulkSms };


const twilio = require('twilio');

// Twilio is OPTIONAL. The client is created lazily (only when a phone-OTP or
// SMS-campaign request actually comes in), not at file load time. This means
// the server boots fine and email login/everything else works normally even
// with zero Twilio env vars set.
let client = null;
const isTwilioConfigured = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

const getClient = () => {
  if (!isTwilioConfigured()) {
    const err = new Error('Phone/SMS is not configured on this server. Use email login instead.');
    err.statusCode = 503;
    throw err;
  }
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

// Uses Twilio Verify service - handles OTP generation/expiry/attempts for you
const sendOtpSms = async (phone) => {
  if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
    const err = new Error('Phone/SMS is not configured on this server. Use email login instead.');
    err.statusCode = 503;
    throw err;
  }
  return getClient()
    .verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({ to: phone, channel: 'sms' });
};

const checkOtpSms = async (phone, code) => {
  return getClient()
    .verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phone, code });
};

// Plain SMS for campaign broadcasts (not OTP)
const sendPlainSms = async (to, body) => {
  return getClient().messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
};

const sendBulkSms = async (recipients, body) => {
  const results = { sent: 0, failed: 0 };
  if (!isTwilioConfigured() || !process.env.TWILIO_PHONE_NUMBER) {
    // Not configured - skip cleanly rather than throwing mid-broadcast
    return { sent: 0, failed: recipients.length, skipped: true };
  }
  for (const to of recipients) {
    try {
      await sendPlainSms(to, body);
      results.sent += 1;
    } catch (err) {
      results.failed += 1;
    }
  }
  return results;
};

module.exports = { sendOtpSms, checkOtpSms, sendPlainSms, sendBulkSms, isTwilioConfigured };