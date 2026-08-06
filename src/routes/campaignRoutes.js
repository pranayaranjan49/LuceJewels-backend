const express = require('express');
const { sendCampaign, getCampaigns } = require('../controllers/campaignController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/send', protect, authorize('admin'), sendCampaign);
router.get('/', protect, authorize('admin'), getCampaigns);

module.exports = router;
