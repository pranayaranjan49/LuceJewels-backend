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

// Basic abuse protection for the simple login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many login attempts, try again later' },
});

// --- ACTIVE: simple login/signup, no verification ---
router.post('/login', loginLimiter, simpleLogin);

// --- DORMANT: OTP-based login/signup - fully working, just unused by the
// frontend right now. Re-enable later by pointing Login.jsx back at
// sendOtp/verifyOtp instead of simpleLogin. Nothing to change here. ---
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests, try again later' },
});
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);

router.get('/me', protect, getMe);

module.exports = router;