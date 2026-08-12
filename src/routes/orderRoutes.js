const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  addTrackingUpdate,
  cancelOrder,
  submitFeedback,
  markComplaintSeen,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my', protect, getMyOrders);
router.get('/', protect, authorize('admin'), getAllOrders);

router.get('/:id', protect, getOrder);
router.patch('/:id/status', protect, authorize('admin'), updateOrderStatus);
router.post('/:id/tracking', protect, authorize('admin'), addTrackingUpdate);
router.patch('/:id/cancel', protect, cancelOrder);
router.post('/:id/feedback', protect, upload.array('photos', 3), submitFeedback);
router.patch('/:id/complaint-seen', protect, authorize('admin'), markComplaintSeen);

module.exports = router;
