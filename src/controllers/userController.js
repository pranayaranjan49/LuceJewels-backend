const User = require('../models/User');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all registered users (admin - for user management panel)
// @route   GET /api/users?search=&role=&page=&limit=
// @access  Admin
const getUsers = asyncHandler(async (req, res) => {
  const { search, role, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];
  }
  if (role) filter.role = role;

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

// @desc    Create a new admin account directly (or promote an existing
//          matching user to admin). Bypasses OTP entirely - an admin
//          creating another admin is an explicit, already-authenticated
//          action, so the new account is marked verified immediately.
// @route   POST /api/users/admins
// @access  Admin
const createOrPromoteAdmin = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'name, email, and phone are all required' });
  }

  let user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });

  if (user) {
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'This person is already an admin' });
    }
    user.role = 'admin';
    await user.save();
    return res.status(200).json({ success: true, message: 'Existing user promoted to admin', data: user });
  }

  user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  res.status(201).json({ success: true, message: 'New admin created', data: user });
});

module.exports = { getUsers, getUser, createOrPromoteAdmin };
