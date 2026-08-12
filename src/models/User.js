const mongoose = require('mongoose');

// _id is intentionally kept (default) on this subdoc now, not disabled -
// each address needs its own id so the frontend can target a specific one
// for edit/delete/set-default.
const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  line1: String,
  city: String,
  state: String,
  pincode: String,
  country: { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false },
});

// Secondary phone numbers - separate from the top-level `phone` field, which
// stays as the account's primary/login number. This array is for "also
// reachable at" numbers, one of which can be flagged primary among itself
// for delivery-contact purposes without touching login.
const phoneSchema = new mongoose.Schema({
  number: { type: String, required: true },
  label: { type: String, default: 'Mobile' },
  isPrimary: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    addresses: [addressSchema],
    phones: [phoneSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    marketingOptIn: { type: Boolean, default: true }, // for campaign broadcasts

    // Cached flags for the admin Users list - avoids an expensive join query
    // against Orders just to render a notification dot per row.
    // hasUnseenComplaint: true right after a "did not receive" / complaint
    // feedback is filed, false again once an admin opens that order.
    hasUnseenComplaint: { type: Boolean, default: false },
    // hasComplaintHistory: set true the first time a complaint is ever
    // filed and NEVER reset - powers a persistent light-red "past complaint"
    // badge even after the unseen dot clears.
    hasComplaintHistory: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

module.exports = mongoose.model('User', userSchema);
