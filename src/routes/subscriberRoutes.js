const express = require('express');
const rateLimit = require('express-rate-limit');
const { subscribe, getSubscribers } = require('../controllers/subscriberController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Prevent signup-form spam/abuse
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts, try again later' },
});

router.post('/', subscribeLimiter, subscribe);
router.get('/', protect, authorize('admin'), getSubscribers);

module.exports = router;
