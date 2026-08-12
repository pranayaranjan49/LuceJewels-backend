const Conversation = require('../models/Conversation');
const asyncHandler = require('../utils/asyncHandler');
const { getIo, userRoom, ADMIN_ROOM } = require('../socket');

// @desc    Get (or create) the logged-in user's own conversation
// @route   GET /api/chat/my
// @access  Private (user)
const getMyConversation = asyncHandler(async (req, res) => {
  let convo = await Conversation.findOne({ user: req.user._id }).populate('messages.orderRef', 'totalAmount status items createdAt');
  if (!convo) {
    convo = await Conversation.create({ user: req.user._id, messages: [] });
  }
  // Opening your own chat marks admin's messages as read
  if (convo.unreadByUser > 0) {
    convo.unreadByUser = 0;
    await convo.save();
  }
  res.json({ success: true, data: convo });
});

// @desc    Admin: list every conversation, most recently active first
// @route   GET /api/chat
// @access  Admin
const getAllConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find()
    .populate('user', 'name email phone')
    .populate('messages.orderRef', 'totalAmount status items createdAt')
    .sort('-lastMessageAt');
  res.json({ success: true, count: conversations.length, data: conversations });
});

// @desc    Admin: open a specific user's conversation (creates it if the
//          admin is starting the thread first)
// @route   GET /api/chat/:userId
// @access  Admin
const getConversationWithUser = asyncHandler(async (req, res) => {
  let convo = await Conversation.findOne({ user: req.params.userId })
    .populate('user', 'name email phone')
    .populate('messages.orderRef', 'totalAmount status items createdAt');
  if (!convo) {
    convo = await Conversation.create({ user: req.params.userId, messages: [] });
    convo = await convo.populate('user', 'name email phone');
  }
  if (convo.unreadByAdmin > 0) {
    convo.unreadByAdmin = 0;
    await convo.save();
  }
  res.json({ success: true, data: convo });
});

// @desc    Send a message. targetUserId is: the user's own id (when a user
//          sends), or the customer's id (when an admin sends into that
//          customer's thread). Persists to DB AND emits in real time.
// @route   POST /api/chat/:targetUserId/message
// @access  Private
// multipart body: { text?, orderRef? }, file: image (optional, 5MB max via upload middleware)
const sendMessage = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const { text, orderRef } = req.body;
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin && String(req.user._id) !== String(targetUserId)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  if (!text && !req.file && !orderRef) {
    return res.status(400).json({ success: false, message: 'Message cannot be empty' });
  }

  let convo = await Conversation.findOne({ user: targetUserId });
  if (!convo) convo = await Conversation.create({ user: targetUserId, messages: [] });

  const message = {
    sender: req.user._id,
    senderRole: isAdmin ? 'admin' : 'user',
    text: text || '',
    orderRef: orderRef || undefined,
    image: req.file ? { url: req.file.path, publicId: req.file.filename } : undefined,
    createdAt: new Date(),
  };

  convo.messages.push(message);
  convo.lastMessageAt = new Date();
  if (isAdmin) convo.unreadByUser += 1;
  else convo.unreadByAdmin += 1;
  await convo.save();

  // Populate the order reference (if any) before returning/emitting, so the
  // chat can render an order-summary card immediately without a refetch.
  await convo.populate('messages.orderRef', 'totalAmount status items createdAt');
  const savedMessage = convo.messages[convo.messages.length - 1];

  // Real-time push: the customer's room always gets it; admins get it via
  // the shared admins room so any open admin dashboard updates live too.
  const io = getIo();
  if (io) {
    io.to(userRoom(targetUserId)).emit('new_message', { conversationUserId: targetUserId, message: savedMessage });
    io.to(ADMIN_ROOM).emit('new_message', { conversationUserId: targetUserId, message: savedMessage });
  }

  res.status(201).json({ success: true, data: savedMessage });
});

module.exports = { getMyConversation, getAllConversations, getConversationWithUser, sendMessage };
