const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  addresses: user.addresses,
  phones: user.phones,
  marketingOptIn: user.marketingOptIn,
});

// @desc    Get own full profile, including addresses and secondary phones
// @route   GET /api/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, data: sanitize(user) });
});

// @desc    Update own name / primary phone
// @route   PATCH /api/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (phone) updates.phone = phone;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: sanitize(user) });
});

// --- Addresses ---

// @desc    Add a new address
// @route   POST /api/profile/addresses
// @access  Private
const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { label, line1, city, state, pincode, country, isDefault } = req.body;

  const newAddress = { label, line1, city, state, pincode, country: country || 'India' };

  // If this is the very first address, or the user explicitly asked for it,
  // make it the default and un-default everything else.
  if (isDefault || user.addresses.length === 0) {
    user.addresses.forEach((a) => { a.isDefault = false; });
    newAddress.isDefault = true;
  }

  user.addresses.push(newAddress);
  await user.save();
  res.status(201).json({ success: true, data: sanitize(user) });
});

// @desc    Update an address
// @route   PUT /api/profile/addresses/:addressId
// @access  Private
const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

  const { label, line1, city, state, pincode, country, isDefault } = req.body;
  if (label !== undefined) address.label = label;
  if (line1 !== undefined) address.line1 = line1;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (pincode !== undefined) address.pincode = pincode;
  if (country !== undefined) address.country = country;

  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = String(a._id) === String(address._id); });
  }

  await user.save();
  res.json({ success: true, data: sanitize(user) });
});

// @desc    Delete an address
// @route   DELETE /api/profile/addresses/:addressId
// @access  Private
const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

  const wasDefault = address.isDefault;
  address.deleteOne();

  // Keep exactly one default address around, if any are left.
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  res.json({ success: true, data: sanitize(user) });
});

// --- Secondary phone numbers ---

// @desc    Add a secondary phone number
// @route   POST /api/profile/phones
// @access  Private
const addPhone = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { number, label, isPrimary } = req.body;
  if (!number) return res.status(400).json({ success: false, message: 'number is required' });

  const newPhone = { number, label: label || 'Mobile' };
  if (isPrimary || user.phones.length === 0) {
    user.phones.forEach((p) => { p.isPrimary = false; });
    newPhone.isPrimary = true;
  }

  user.phones.push(newPhone);
  await user.save();
  res.status(201).json({ success: true, data: sanitize(user) });
});

// @desc    Mark a secondary phone as primary (among the secondary list)
// @route   PATCH /api/profile/phones/:phoneId/primary
// @access  Private
const setPrimaryPhone = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const phone = user.phones.id(req.params.phoneId);
  if (!phone) return res.status(404).json({ success: false, message: 'Phone number not found' });

  user.phones.forEach((p) => { p.isPrimary = String(p._id) === String(phone._id); });
  await user.save();
  res.json({ success: true, data: sanitize(user) });
});

// @desc    Delete a secondary phone number
// @route   DELETE /api/profile/phones/:phoneId
// @access  Private
const deletePhone = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const phone = user.phones.id(req.params.phoneId);
  if (!phone) return res.status(404).json({ success: false, message: 'Phone number not found' });

  phone.deleteOne();
  await user.save();
  res.json({ success: true, data: sanitize(user) });
});

module.exports = {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  addPhone,
  setPrimaryPhone,
  deletePhone,
};
