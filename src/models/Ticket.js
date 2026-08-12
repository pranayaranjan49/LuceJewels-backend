const mongoose = require('mongoose');

const ticketPhotoSchema = new mongoose.Schema({ url: String, publicId: String }, { _id: false });

// A formal complaint/support ticket - separate from the live chat, and
// separate from the post-delivery "feedback" complaint on Order - this is
// the general "raise a ticket about anything, anytime" path from Help.
const ticketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // optional - not every ticket is order-specific
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    photos: [ticketPhotoSchema],
    status: {
      type: String,
      enum: ['registered', 'under_process', 'resolved'],
      default: 'registered',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
