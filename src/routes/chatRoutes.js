const express = require('express');
const {
  getMyConversation,
  getAllConversations,
  getConversationWithUser,
  sendMessage,
} = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/my', protect, getMyConversation);
router.get('/', protect, authorize('admin'), getAllConversations);
router.get('/:userId', protect, authorize('admin'), getConversationWithUser);
router.post('/:targetUserId/message', protect, upload.single('image'), sendMessage);

module.exports = router;
