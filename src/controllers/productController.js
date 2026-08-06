const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiFeatures = require('../utils/apiFeatures');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get products (filter, search, sort, paginate)
// @route   GET /api/products?category=&search=&sort=-price&page=1&limit=12&price[gte]=1000
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const baseQuery = Product.find({ isActive: true }).populate('category', 'name slug');

  const features = new ApiFeatures(baseQuery, req.query).filter().search().sort().paginate();
  const products = await features.query;
  const total = await Product.countDocuments({ isActive: true });

  res.json({
    success: true,
    count: products.length,
    total,
    page: features.pagination.page,
    pages: Math.ceil(total / features.pagination.limit),
    data: products,
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, data: product });
});

// @desc    Create product
// @route   POST /api/products
// @access  Admin
// Uses multer(upload.array('images', 5)) before this - req.files contains cloudinary results
const createProduct = asyncHandler(async (req, res) => {
  const body = { ...req.body };

  const slug = body.name.toLowerCase().trim().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5);
  const sku = 'SKU-' + Date.now().toString().slice(-8);

  const images = (req.files || []).map((f) => ({ url: f.path, publicId: f.filename }));

  const product = await Product.create({ ...body, slug, sku, images });
  res.status(201).json({ success: true, data: product });
});

// @desc    Update product (details, price, stock, quality, offers)
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const updates = { ...req.body };

  // if new images uploaded, append them (keep existing unless admin explicitly removes)
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((f) => ({ url: f.path, publicId: f.filename }));
    updates.images = [...product.images, ...newImages];
  }

  Object.assign(product, updates);
  await product.save();

  res.json({ success: true, data: product });
});

// @desc    Quick stock/price update (lightweight endpoint for inventory management)
// @route   PATCH /api/products/:id/stock
// @access  Admin
// body: { stock } or { stock, price, discountPrice }
const updateStock = asyncHandler(async (req, res) => {
  const { stock, price, discountPrice } = req.body;
  const update = {};
  if (stock !== undefined) update.stock = stock;
  if (price !== undefined) update.price = price;
  if (discountPrice !== undefined) update.discountPrice = discountPrice;

  const product = await Product.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, data: product });
});

// @desc    Delete product + its cloudinary images
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  // clean up images from cloudinary (best-effort, don't block deletion on failure)
  await Promise.allSettled(
    product.images.map((img) => (img.publicId ? cloudinary.uploader.destroy(img.publicId) : null))
  );

  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted' });
});

// @desc    Low stock report for admin dashboard
// @route   GET /api/products/low-stock?threshold=5
// @access  Admin
const getLowStock = asyncHandler(async (req, res) => {
  const threshold = Number(req.query.threshold) || 5;
  const products = await Product.find({ stock: { $lte: threshold }, isActive: true }).populate(
    'category',
    'name'
  );
  res.json({ success: true, count: products.length, data: products });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  getLowStock,
};
