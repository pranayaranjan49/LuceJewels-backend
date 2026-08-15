const mongoose = require('mongoose');

// Homepage hero carousel slides - fully admin-managed, this is what powers
// the auto-sliding banner section on the storefront.
const bannerSchema = new mongoose.Schema(
  {
    image: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    // ctaLabel: { type: String, default: 'Shop Now' },
    // ctaLink: { type: String, default: '/shop' },
    // order: { type: Number, default: 0 }, // controls slide sequence, lower first
    ctaLabel: { type: String, default: 'Shop Now' },
    ctaLink: { type: String, default: '/shop' },
    textColor: { type: String, enum: ['dark', 'gold', 'pink'], default: 'dark' },
    order: { type: Number, default: 0 }, // controls slide sequence, lower first
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bannerSchema.index({ order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
