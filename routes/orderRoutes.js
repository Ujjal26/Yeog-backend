/**
 * @file orderRoutes.js
 * @description Express router for order administration endpoints (fetching active table orders and analytics data).
 */

const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");

/**
 * @route   GET /api/orders
 * @desc    Fetch all active kitchen/table orders
 * @access  Private (Admin only)
 */
router.get("/", authMiddleware, orderController.getAllOrders);

/**
 * @route   GET /api/orders/orderdata
 * @desc    Fetch sales report and order analytics data
 * @access  Private (Admin only)
 */
router.get("/orderdata", authMiddleware, orderController.getOrderData);

module.exports = router;

