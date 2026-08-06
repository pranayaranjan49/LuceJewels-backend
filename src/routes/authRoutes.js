// const express = require('express');
// const rateLimit = require('express-rate-limit');
// const { sendOtp, verifyOtp, getMe } = require('../controllers/authController');
// const { protect } = require('../middleware/auth');

// const router = express.Router();

// // Prevent OTP spam/abuse
// const otpLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 5,
//   message: { success: false, message: 'Too many OTP requests, try again later' },
// });

// router.post('/send-otp', otpLimiter, sendOtp);
// router.post('/verify-otp', verifyOtp);
// router.get('/me', protect, getMe);

// module.exports = router;


const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendOtp, verifyOtp, getMe, simpleLogin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Prevent OTP spam/abuse (kept in place - unused by the frontend right now,
// but the endpoints below still work if you re-enable OTP later)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests, try again later' },
});

// Basic abuse protection for the simple login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many login attempts, try again later' },
});

// --- Active: simple login/signup, no verification ---
router.post('/login', loginLimiter, simpleLogin);

// --- Dormant: OTP-based login, kept fully working for when you have a domain ---
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);

router.get('/me', protect, getMe);

module.exports = router;