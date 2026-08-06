const express = require('express');
const { getUsers, getUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('admin'), getUsers);
router.get('/:id', protect, authorize('admin'), getUser);

module.exports = router;
