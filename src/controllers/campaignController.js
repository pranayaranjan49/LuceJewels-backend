const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const Campaign = require('../models/Campaign');
const asyncHandler = require('../utils/asyncHandler');
const { sendBulkEmail } = require('../utils/sendEmail');
const { sendBulkSms } = require('../utils/sendSms');

// @desc    Broadcast an offer/announcement to every registered user AND every
//          newsletter subscriber, by email and/or SMS.
// @route   POST /api/campaigns/send
// @access  Admin
// body: { title, message, channel: 'email' | 'sms' | 'both' }
const sendCampaign = asyncHandler(async (req, res) => {
  const { title, message, channel } = req.body;
  if (!title || !message || !channel) {
    return res.status(400).json({ success: false, message: 'title, message, and channel are required' });
  }

  const users = await User.find({ marketingOptIn: true });
  const subscribers = await Subscriber.find({ isActive: true });

  const stats = { emailSent: 0, emailFailed: 0, smsSent: 0, smsFailed: 0 };

  if (channel === 'email' || channel === 'both') {
    // NOTE: filtering on isEmailVerified would exclude everyone who signed up
    // through the simple (no-OTP) login, since that flow never sets it. Any
    // user or subscriber with an email address on file is a legitimate
    // recipient here - unsubscribing is handled via marketingOptIn / isActive.
    const userEmails = users.map((u) => u.email).filter(Boolean);
    const subscriberEmails = subscribers.map((s) => s.email).filter(Boolean);
    const emails = [...new Set([...userEmails, ...subscriberEmails])];

    const result = await sendBulkEmail({
      recipients: emails,
      subject: title,
      html: `<div style="font-family:sans-serif"><h2>${title}</h2><p>${message}</p></div>`,
    });
    stats.emailSent = result.sent;
    stats.emailFailed = result.failed;
  }

  if (channel === 'sms' || channel === 'both') {
    // Subscribers have no phone number on file - SMS only ever reaches
    // registered users who verified a phone number via OTP.
    const phones = users.filter((u) => u.isPhoneVerified).map((u) => u.phone);
    const result = await sendBulkSms(phones, `${title}: ${message}`);
    stats.smsSent = result.sent;
    stats.smsFailed = result.failed;
  }

  const totalRecipients = new Set([
    ...users.map((u) => u.email),
    ...subscribers.map((s) => s.email),
  ]).size;

  const campaign = await Campaign.create({
    title,
    message,
    channel,
    sentBy: req.user._id,
    recipientCount: totalRecipients,
    stats,
  });

  res.status(201).json({ success: true, data: campaign });
});

// @desc    Get campaign history
// @route   GET /api/campaigns
// @access  Admin
const getCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await Campaign.find().sort('-createdAt').populate('sentBy', 'name email');
  res.json({ success: true, count: campaigns.length, data: campaigns });
});

module.exports = { sendCampaign, getCampaigns };
