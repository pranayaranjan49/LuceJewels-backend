const mongoose = require('mongoose');

// Used only for EMAIL otp (phone otp is handled by Twilio Verify directly)
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, enum: ['login', 'register'], default: 'login' },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
});

// TTL index - Mongo auto-deletes expired OTP docs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
