const express = require('express');
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my', protect, getMyOrders);
router.get('/', protect, authorize('admin'), getAllOrders);
router.patch('/:id/status', protect, authorize('admin'), updateOrderStatus);

module.exports = router;
