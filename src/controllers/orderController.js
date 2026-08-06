const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Place an order (validates stock, deducts it atomically)
// @route   POST /api/orders
// @access  Private
// body: { items: [{ product, quantity }], shippingAddress }
const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Order must have at least one item' });
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

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, data: order });
});

module.exports = { createOrder, getMyOrders, getAllOrders, updateOrderStatus };
