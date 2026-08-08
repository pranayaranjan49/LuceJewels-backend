const Subscriber = require('../models/Subscriber');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Subscribe an email to offers/newsletter (no account required)
// @route   POST /api/subscribers
// @access  Public
// body: { email, source? }
const subscribe = asyncHandler(async (req, res) => {
  const { email, source } = req.body;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }

  const normalized = email.toLowerCase().trim();

  // Upsert: re-subscribing (or re-submitting the same email) just reactivates
  // it instead of throwing a duplicate-key error.
  const subscriber = await Subscriber.findOneAndUpdate(
    { email: normalized },
    { email: normalized, source: source || 'footer', isActive: true },
    { upsert: true, new: true, runValidators: true }
  );

  res.status(201).json({ success: true, message: 'Subscribed successfully', data: subscriber });
});

// @desc    List all subscribers (admin)
// @route   GET /api/subscribers
// @access  Admin
const getSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await Subscriber.find({ isActive: true }).sort('-createdAt');
  res.json({ success: true, count: subscribers.length, data: subscribers });
});

module.exports = { subscribe, getSubscribers };
