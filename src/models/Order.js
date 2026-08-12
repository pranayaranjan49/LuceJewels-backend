const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    image: String,
    price: Number,
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// One entry per admin-added tracking message, e.g. "Your order has reached
// the Bhubaneswar hub". Rendered as the message list under the status
// timeline on the user's tracking page.
const trackingUpdateSchema = new mongoose.Schema(
  {
    status: { type: String }, // status at the time this update was posted, optional
    message: { type: String, required: true },
    location: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const feedbackPhotoSchema = new mongoose.Schema(
  { url: String, publicId: String },
  { _id: false }
);

// Filed once, after delivery - either a star rating, or a "didn't receive it"
// complaint (or both). isComplaint drives the red/light-red indicator on the
// admin Users page; adminSeen clears the red dot once an admin opens it.
const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '' },
    notReceived: { type: Boolean, default: false },
    photos: [feedbackPhotoSchema],
    isComplaint: { type: Boolean, default: false },
    adminSeen: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      line1: String,
      city: String,
      state: String,
      pincode: String,
      country: String,
      phone: String,
    },
    paymentMethod: {
      type: String,
      enum: ['cod', 'upi'],
      default: 'cod',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    trackingUpdates: [trackingUpdateSchema],
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: '' },
    feedback: feedbackSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
