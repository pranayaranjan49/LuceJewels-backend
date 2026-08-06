const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // Rings, Necklaces, Earrings...
    slug: { type: String, required: true, unique: true, lowercase: true },
    image: { url: String, publicId: String },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
