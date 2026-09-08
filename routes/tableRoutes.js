/**
 * @file tableRoutes.js
 * @description Express router for table management endpoints (listing, creation, status toggles, and QR authentication).
 */

const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/tables
 * @desc    Fetch all dining tables and their current status
 * @access  Public (Customer & Admin)
 */
router.get('/', tableController.getTables);

/**
 * @route   POST /api/tables
 * @desc    Create a new dining table with generated QR token
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, tableController.addTable);

/**
 * @route   PUT /api/tables/:id/toggle-status
 * @desc    Update/toggle operational status of a table
 * @access  Private (Admin only)
 */
router.put('/:id/toggle-status', authMiddleware, tableController.toggleTableStatus);

/**
 * @route   POST /api/tables/validate-qr
 * @desc    Validate scanned QR code (tableNumber & qrToken) and obtain customer session token
 * @access  Public
 */
router.post('/validate-qr', tableController.validateQR);

module.exports = router;

