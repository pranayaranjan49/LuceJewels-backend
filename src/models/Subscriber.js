const mongoose = require('mongoose');

// Captures newsletter/offer signups from people who aren't (yet) full
// registered users - e.g. a footer "get offers" box. Kept separate from
// User so someone can subscribe without creating an account, and so a
// registered user unsubscribing from marketing doesn't touch their login.
const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    source: { type: String, default: 'footer' }, // where they signed up from
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscriber', subscriberSchema);
