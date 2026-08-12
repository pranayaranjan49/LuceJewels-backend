const express = require('express');
const { getUsers, getUser, createOrPromoteAdmin } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('admin'), getUsers);
router.post('/admins', protect, authorize('admin'), createOrPromoteAdmin);
router.get('/:id', protect, authorize('admin'), getUser);

module.exports = router;
