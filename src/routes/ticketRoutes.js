const express = require('express');
const { createTicket, getMyTickets, getAllTickets, updateTicketStatus } = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', protect, upload.array('photos', 3), createTicket);
router.get('/my', protect, getMyTickets);
router.get('/', protect, authorize('admin'), getAllTickets);
router.patch('/:id/status', protect, authorize('admin'), updateTicketStatus);

module.exports = router;
