const Ticket = require('../models/Ticket');
const asyncHandler = require('../utils/asyncHandler');
const { getIo, ADMIN_ROOM } = require('../socket');

// @desc    Raise a new support ticket (optionally tied to an order, with photos)
// @route   POST /api/tickets
// @access  Private (user)
// multipart body: { subject, description, order? }, files: photos[] (max 3, 5MB each)
const createTicket = asyncHandler(async (req, res) => {
  const { subject, description, order } = req.body;
  if (!subject || !description) {
    return res.status(400).json({ success: false, message: 'subject and description are required' });
  }

  const photos = (req.files || []).map((f) => ({ url: f.path, publicId: f.filename }));

  const ticket = await Ticket.create({
    user: req.user._id,
    order: order || undefined,
    subject,
    description,
    photos,
  });

  const io = getIo();
  if (io) io.to(ADMIN_ROOM).emit('new_ticket', { ticket });

  res.status(201).json({ success: true, data: ticket });
});

// @desc    Get logged-in user's own tickets
// @route   GET /api/tickets/my
// @access  Private (user)
const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user: req.user._id }).populate('order', 'totalAmount status').sort('-createdAt');
  res.json({ success: true, count: tickets.length, data: tickets });
});

// @desc    Admin: list all tickets (optionally filtered by status)
// @route   GET /api/tickets?status=
// @access  Admin
const getAllTickets = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const tickets = await Ticket.find(filter)
    .populate('user', 'name email phone')
    .populate('order', 'totalAmount status')
    .sort('-createdAt');

  const counts = {
    registered: await Ticket.countDocuments({ status: 'registered' }),
    under_process: await Ticket.countDocuments({ status: 'under_process' }),
    resolved: await Ticket.countDocuments({ status: 'resolved' }),
    total: await Ticket.countDocuments(),
  };

  res.json({ success: true, count: tickets.length, counts, data: tickets });
});

// @desc    Admin updates a ticket's status
// @route   PATCH /api/tickets/:id/status
// @access  Admin
const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['registered', 'under_process', 'resolved'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

  res.json({ success: true, data: ticket });
});

module.exports = { createTicket, getMyTickets, getAllTickets, updateTicketStatus };
