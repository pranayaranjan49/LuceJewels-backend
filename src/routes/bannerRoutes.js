const express = require('express');
const {
  getBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
} = require('../controllers/bannerController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', getBanners);
router.get('/admin', protect, authorize('admin'), getAllBannersAdmin);
router.post('/', protect, authorize('admin'), upload.single('image'), createBanner);
router.put('/:id', protect, authorize('admin'), upload.single('image'), updateBanner);
router.delete('/:id', protect, authorize('admin'), deleteBanner);

module.exports = router;
