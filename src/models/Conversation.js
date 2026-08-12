const mongoose = require('mongoose');

// One conversation per customer with "the seller" (any admin can reply into
// it - it's not per-admin-agent, matching a small business support inbox).
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['user', 'admin'], required: true },
  text: { type: String, default: '' },
  image: {
    url: { type: String },
    publicId: { type: String },
  },
  // Optional: this message references a specific order (rendered as an
  // order-summary card in the chat instead of plain text).
  orderRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  createdAt: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    messages: [messageSchema],
    lastMessageAt: { type: Date, default: Date.now },
    unreadByAdmin: { type: Number, default: 0 }, // messages the user sent, admin hasn't opened yet
    unreadByUser: { type: Number, default: 0 },  // messages an admin sent, user hasn't opened yet
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
