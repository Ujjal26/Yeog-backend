/**
 * @file menuRoutes.js
 * @description Express router for menu catalog endpoints (retrieval, addition, modification, deletion, availability toggling).
 */

const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/menu
 * @desc    Get all menu items catalog
 * @access  Public
 */
router.get('/', menuController.getAllItems);

/**
 * @route   GET /api/menu/stock-summary
 * @desc    Get stock summary: total items, in-stock count, and total stock value
 * @access  Public
 */
router.get('/stock-summary', menuController.getStockSummary);

/**
 * @route   POST /api/menu
 * @desc    Create a new menu item
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, menuController.addItem);

/**
 * @route   PUT /api/menu/:id
 * @desc    Update details of an existing menu item
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, menuController.updateItem);

/**
 * @route   DELETE /api/menu/:id
 * @desc    Remove a menu item from catalog
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, menuController.deleteItem);

/**
 * @route   PUT /api/menu/:id/toggle-availability
 * @desc    Toggle stock availability (isAvailable) of a menu item
 * @access  Private (Admin only)
 */
router.put('/:id/toggle-availability', authMiddleware, menuController.toggleAvailability);

module.exports = router;

