const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');

router.post('/', checkInController.checkIn);
router.post('/checkout', checkInController.checkOut);
router.get('/count', checkInController.getActiveCount);
router.get('/all', checkInController.getAllCheckIns);
router.post('/auto-cleanup', checkInController.autoCheckOutStale);

module.exports = router;
