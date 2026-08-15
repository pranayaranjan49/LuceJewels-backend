const Banner = require('../models/Banner');
const asyncHandler = require('../utils/asyncHandler');
const { cloudinary } = require('../config/cloudinary');

// @desc    Get active homepage banners, in display order
// @route   GET /api/banners
// @access  Public
const getBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort('order');
  res.json({ success: true, count: banners.length, data: banners });
});

// @desc    Get ALL banners including inactive ones (admin management view)
// @route   GET /api/banners/admin
// @access  Admin
const getAllBannersAdmin = asyncHandler(async (req, res) => {
  const banners = await Banner.find().sort('order');
  res.json({ success: true, count: banners.length, data: banners });
});

// @desc    Create a banner slide (image required)
// @route   POST /api/banners
// @access  Admin
const createBanner = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'An image is required' });
  }

  // const { title, subtitle, ctaLabel, ctaLink, order } = req.body;
  // const banner = await Banner.create({
  //   title,
  //   subtitle,
  //   ctaLabel,
  //   ctaLink,
  //   order: order !== undefined ? Number(order) : 0,
  //   image: { url: req.file.path, publicId: req.file.filename },
  // });
  const { title, subtitle, ctaLabel, ctaLink, textColor, order } = req.body;
  const banner = await Banner.create({
    title,
    subtitle,
    ctaLabel,
    ctaLink,
    textColor,
    order: order !== undefined ? Number(order) : 0,
    image: { url: req.file.path, publicId: req.file.filename },
  });
  
  res.status(201).json({ success: true, data: banner });
});

// @desc    Update a banner (details and/or replace its image)
// @route   PUT /api/banners/:id
// @access  Admin
const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

  const updates = { ...req.body };
  if (updates.order !== undefined) updates.order = Number(updates.order);

  // Replacing the image: upload the new one (multer/cloudinary already did
  // that before this handler runs), then clean up the old one from Cloudinary
  // so unused images don't pile up in your storage.
  if (req.file) {
    const oldPublicId = banner.image?.publicId;
    updates.image = { url: req.file.path, publicId: req.file.filename };
    if (oldPublicId) {
      cloudinary.uploader.destroy(oldPublicId).catch(() => {}); // best-effort, don't block the response
    }
  }

  Object.assign(banner, updates);
  await banner.save();

  res.json({ success: true, data: banner });
});

// @desc    Delete a banner + its Cloudinary image
// @route   DELETE /api/banners/:id
// @access  Admin
const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

  if (banner.image?.publicId) {
    await cloudinary.uploader.destroy(banner.image.publicId).catch(() => {});
  }
  await banner.deleteOne();

  res.json({ success: true, message: 'Banner deleted' });
});

module.exports = { getBanners, getAllBannersAdmin, createBanner, updateBanner, deleteBanner };
