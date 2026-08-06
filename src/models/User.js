const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    line1: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

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
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    marketingOptIn: { type: Boolean, default: true }, // for campaign broadcasts
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

module.exports = mongoose.model('User', userSchema);
