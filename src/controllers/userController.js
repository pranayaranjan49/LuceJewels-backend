const User = require('../models/User');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all registered users (admin - for user management panel)
// @route   GET /api/users?search=&page=&limit=
// @access  Admin
const getUsers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;

  const filter = search
    ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }
    : {};

  const users = await User.find(filter)
    .select('-__v')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(filter);
  res.json({ success: true, count: users.length, total, data: users });
});

// @desc    Get single user detail + their order history
// @route   GET /api/users/:id
// @access  Admin
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const orders = await Order.find({ user: user._id }).sort('-createdAt');
  res.json({ success: true, data: { user, orders } });
});

module.exports = { getUsers, getUser };
