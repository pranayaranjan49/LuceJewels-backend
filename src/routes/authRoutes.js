const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendOtp, verifyOtp, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Prevent OTP spam/abuse
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests, try again later' },
});

router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', protect, getMe);

module.exports = router;
