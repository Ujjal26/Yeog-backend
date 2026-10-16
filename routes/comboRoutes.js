/**
 * @file comboRoutes.js
 * @description Express router for combo/deal bundle endpoints.
 * Public GET for customer-facing menu; all mutation routes are admin-protected.
 */

const express = require('express');
const router = express.Router();
const comboController = require('../controllers/comboController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/combos
 * @desc    Get all available combos (with populated items + derived fields).
 *          Pass ?all=true (admin) to include manually-disabled combos.
 * @access  Public
 */
router.get('/', comboController.getAllCombos);

/**
 * @route   POST /api/combos
 * @desc    Create a new combo deal
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, comboController.addCombo);

/**
 * @route   PUT /api/combos/:id
 * @desc    Update an existing combo deal
 * @access  Private (Admin only)
 */
router.put('/:id', authMiddleware, comboController.updateCombo);

/**
 * @route   DELETE /api/combos/:id
 * @desc    Remove a combo deal
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, comboController.deleteCombo);

/**
 * @route   PUT /api/combos/:id/toggle-availability
 * @desc    Toggle the manual isAvailable flag on a combo
 * @access  Private (Admin only)
 */
router.put('/:id/toggle-availability', authMiddleware, comboController.toggleComboAvailability);

module.exports = router;
