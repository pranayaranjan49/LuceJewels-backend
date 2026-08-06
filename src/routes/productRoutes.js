const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
  getLowStock,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', getProducts);
router.get('/low-stock', protect, authorize('admin'), getLowStock);
router.get('/:id', getProduct);

router.post('/', protect, authorize('admin'), upload.array('images', 5), createProduct);
router.put('/:id', protect, authorize('admin'), upload.array('images', 5), updateProduct);
router.patch('/:id/stock', protect, authorize('admin'), updateStock);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;
