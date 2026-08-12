const express = require('express');
const {
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  addPhone,
  setPrimaryPhone,
  deletePhone,
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // every route below requires login

router.get('/', getProfile);
router.patch('/', updateProfile);

router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);

router.post('/phones', addPhone);
router.patch('/phones/:phoneId/primary', setPrimaryPhone);
router.delete('/phones/:phoneId', deletePhone);

module.exports = router;
