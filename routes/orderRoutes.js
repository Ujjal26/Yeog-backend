const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all active orders (Admin only)
router.get('/', authMiddleware, orderController.getAllOrders);

module.exports = router;
