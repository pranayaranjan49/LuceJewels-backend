const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { cloudinary } = require('../config/cloudinary');

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing'];

// @desc    Place an order (validates stock, deducts it atomically)
// @route   POST /api/orders
// @access  Private
// body: { items: [{ product, quantity }], shippingAddress, paymentMethod }
const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Order must have at least one item' });
  }
  if (paymentMethod === 'upi') {
    return res.status(400).json({ success: false, message: 'UPI payments are coming soon - please select Cash on Delivery for now' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error(`Product not found: ${item.product}`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
      }

      const unitPrice = product.discountPrice > 0 ? product.discountPrice : product.price;
      totalAmount += unitPrice * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        price: unitPrice,
        quantity: item.quantity,
      });

      product.stock -= item.quantity;
      await product.save({ session });
    }

    const [order] = await Order.create(
      [
        {
          user: req.user._id,
          items: orderItems,
          totalAmount,
          shippingAddress,
          paymentMethod: paymentMethod === 'upi' ? 'upi' : 'cod',
          trackingUpdates: [{ status: 'pending', message: 'Order placed successfully.' }],
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Get logged-in user's orders
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
  res.json({ success: true, count: orders.length, data: orders });
});

// @desc    Get a single order with full tracking timeline/feedback
// @route   GET /api/orders/:id
// @access  Private (owner) or Admin
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const isOwner = String(order.user._id) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
  }

  res.json({ success: true, data: order });
});

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};

  const orders = await Order.find(filter)
    .populate('user', 'name email phone')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Order.countDocuments(filter);
  res.json({ success: true, count: orders.length, total, data: orders });
});

// @desc    Update order status (also logs an automatic tracking-timeline entry)
// @route   PATCH /api/orders/:id/status
// @access  Admin
const STATUS_LABELS = {
  pending: 'Order placed successfully.',
  confirmed: 'Order confirmed and being prepared.',
  processing: 'Order is being processed.',
  shipped: 'Order has been shipped.',
  out_for_delivery: 'Order is out for delivery.',
  delivered: 'Order delivered.',
  cancelled: 'Order was cancelled.',
};

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.status = status;
  order.trackingUpdates.push({ status, message: STATUS_LABELS[status] || `Status updated to ${status}` });
  await order.save();

  res.json({ success: true, data: order });
});

// @desc    Admin adds a custom tracking message (e.g. "Reached Bhubaneswar hub")
// @route   POST /api/orders/:id/tracking
// @access  Admin
// body: { message, location? }
const addTrackingUpdate = asyncHandler(async (req, res) => {
  const { message, location } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'message is required' });

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.trackingUpdates.push({ status: order.status, message, location: location || '' });
  await order.save();

  res.json({ success: true, data: order });
});

// @desc    User cancels their own order (only while it's still cancellable;
//          restocks the products it reserved)
// @route   PATCH /api/orders/:id/cancel
// @access  Private (owner only)
// body: { reason? }
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (String(order.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
  }
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: `Order can no longer be cancelled (current status: ${order.status})`,
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } }, { session });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = req.body.reason || '';
    order.trackingUpdates.push({ status: 'cancelled', message: 'Order was cancelled by the customer.' });
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.json({ success: true, data: order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: 'Could not cancel order, please try again' });
  }
});

// @desc    User submits post-delivery feedback (rating and/or a "didn't
//          receive it" complaint, with optional photos)
// @route   POST /api/orders/:id/feedback
// @access  Private (owner only)
// multipart body: { rating?, comment?, notReceived? }, files: photos[] (max 3, 5MB each - enforced by upload middleware)
const submitFeedback = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (String(order.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  if (order.status !== 'delivered') {
    return res.status(400).json({ success: false, message: 'Feedback can only be left after delivery' });
  }

  const { rating, comment, notReceived } = req.body;
  const isNotReceived = notReceived === 'true' || notReceived === true;
  const photos = (req.files || []).map((f) => ({ url: f.path, publicId: f.filename }));

  const isComplaint = isNotReceived || (!!comment && comment.trim().length > 0 && Number(rating) <= 2);

  order.feedback = {
    rating: rating ? Number(rating) : undefined,
    comment: comment || '',
    notReceived: isNotReceived,
    photos,
    isComplaint,
    adminSeen: false,
    submittedAt: new Date(),
  };
  await order.save();

  if (isComplaint) {
    await User.findByIdAndUpdate(order.user, { hasUnseenComplaint: true, hasComplaintHistory: true });
  }

  res.json({ success: true, data: order });
});

// @desc    Admin marks a complaint as seen - clears the red dot on the Users
//          list once no other unseen complaints remain for that user
// @route   PATCH /api/orders/:id/complaint-seen
// @access  Admin
const markComplaintSeen = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!order.feedback?.isComplaint) {
    return res.status(400).json({ success: false, message: 'This order has no complaint to mark seen' });
  }

  order.feedback.adminSeen = true;
  await order.save();

  const remaining = await Order.exists({
    user: order.user,
    'feedback.isComplaint': true,
    'feedback.adminSeen': false,
  });
  if (!remaining) {
    await User.findByIdAndUpdate(order.user, { hasUnseenComplaint: false });
  }

  res.json({ success: true, data: order });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  addTrackingUpdate,
  cancelOrder,
  submitFeedback,
  markComplaintSeen,
};
