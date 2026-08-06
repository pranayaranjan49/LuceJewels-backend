const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all active categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort('name');
  res.json({ success: true, count: categories.length, data: categories });
});

// @desc    Create category
// @route   POST /api/categories
// @access  Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-');

  const category = await Category.create({
    name,
    slug,
    description,
    image: req.file ? { url: req.file.path, publicId: req.file.filename } : undefined,
  });

  res.status(201).json({ success: true, data: category });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Admin
const updateCategory = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  if (updates.name) updates.slug = updates.name.toLowerCase().trim().replace(/\s+/g, '-');
  if (req.file) updates.image = { url: req.file.path, publicId: req.file.filename };

  const category = await Category.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, data: category });
});

// @desc    Delete category (soft delete)
// @route   DELETE /api/categories/:id
// @access  Admin
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category deactivated' });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
