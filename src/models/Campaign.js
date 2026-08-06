const mongoose = require('mongoose');

// Logs every broadcast the admin sends (audit trail + avoid resending)
const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    channel: { type: String, enum: ['email', 'sms', 'both'], required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipientCount: { type: Number, default: 0 },
    stats: {
      emailSent: { type: Number, default: 0 },
      emailFailed: { type: Number, default: 0 },
      smsSent: { type: Number, default: 0 },
      smsFailed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
