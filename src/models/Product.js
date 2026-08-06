const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  { url: String, publicId: String },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    description: { type: String, required: true },
    images: [imageSchema],

    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 }, // 0 = no discount
    stock: { type: Number, required: true, default: 0, min: 0 },
    sku: { type: String, unique: true },

    // Jewelry-specific quality fields
    material: { type: String, enum: ['Gold', 'Silver', 'Platinum', 'Diamond', 'Rose Gold', 'Other'], default: 'Gold' },
    purity: { type: String, default: '' }, // e.g. "22K", "18K", "925 Sterling"
    weight: { type: Number, default: 0 }, // grams
    gemstone: { type: String, default: '' },

    tags: [String],
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });

// Virtual: effective selling price
productSchema.virtual('finalPrice').get(function () {
  return this.discountPrice > 0 ? this.discountPrice : this.price;
});
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
