const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const { sendEmail } = require('../utils/sendEmail');
const { sendOtpSms, checkOtpSms } = require('../utils/sendSms');

// Generates a 6-digit numeric OTP
const generateOtpCode = () => String(crypto.randomInt(100000, 999999));

// @desc    Send OTP to email and/or phone (register or login)
// @route   POST /api/auth/send-otp
// @access  Public
// body: { channel: 'email' | 'phone', email?, phone?, name? (required if new user) }
const sendOtp = asyncHandler(async (req, res) => {
  const { channel, email, phone } = req.body;

  if (!channel || (channel !== 'email' && channel !== 'phone')) {
    return res.status(400).json({ success: false, message: 'channel must be "email" or "phone"' });
  }

  if (channel === 'phone') {
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });
    await sendOtpSms(phone); // Twilio Verify handles code generation + expiry
    return res.json({ success: true, message: 'OTP sent to phone' });
  }

  // channel === 'email'
  if (!email) return res.status(400).json({ success: false, message: 'email is required' });

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);

  // remove any previous unexpired OTPs for this email to avoid confusion
  await Otp.deleteMany({ email: email.toLowerCase() });

  await Otp.create({
    email: email.toLowerCase(),
    codeHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  });

  await sendEmail({
    to: email,
    subject: 'Your Jewelva verification code',
    html: `<div style="font-family:sans-serif">
            <h1>Welcome to Luxe Jewels. Explore the Home Fashion and Jeweleries</h1>
             <h2>Your verification code</h2>
             <p style="font-size:28px;letter-spacing:4px;font-weight:bold">${code}</p>
             <p>This code expires in 10 minutes. Huryy up</p>
           </div>`,
  });

  res.json({ success: true, message: 'OTP sent to email' });
});

// @desc    Verify OTP - creates user if new, logs in if existing, returns JWT
// @route   POST /api/auth/verify-otp
// @access  Public
// body: { channel, email?, phone?, code, name? }  -- name required for first-time registration
const verifyOtp = asyncHandler(async (req, res) => {
  const { channel, email, phone, code, name } = req.body;

  if (!code) return res.status(400).json({ success: false, message: 'code is required' });

  if (channel === 'phone') {
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });

    const check = await checkOtpSms(phone, code);
    if (check.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'name and email are required to complete registration',
        });
      }
      user = await User.create({ name, email, phone, isPhoneVerified: true });
    } else {
      user.isPhoneVerified = true;
      await user.save();
    }

    const token = generateToken(user._id, user.role);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  }

  // channel === 'email'
  if (!email) return res.status(400).json({ success: false, message: 'email is required' });

  const otpDoc = await Otp.findOne({ email: email.toLowerCase() }).sort({ _id: -1 });
  if (!otpDoc) {
    return res.status(400).json({ success: false, message: 'No OTP found, please request a new one' });
  }

  if (otpDoc.attempts >= 5) {
    await Otp.deleteMany({ email: email.toLowerCase() });
    return res.status(429).json({ success: false, message: 'Too many attempts, request a new OTP' });
  }

  const isMatch = await bcrypt.compare(code, otpDoc.codeHash);
  if (!isMatch) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  await Otp.deleteMany({ email: email.toLowerCase() });

  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'name and phone are required to complete registration',
      });
    }
    user = await User.create({ name, email: email.toLowerCase(), phone, isEmailVerified: true });
  } else {
    user.isEmailVerified = true;
    await user.save();
  }

  const token = generateToken(user._id, user.role);
  res.json({ success: true, token, user: sanitizeUser(user) });
});

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
  };
}

module.exports = { sendOtp, verifyOtp, getMe };
