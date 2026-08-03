const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const authMiddleware = require('../middlewares/authMiddleware');

// Fetch all tables (Public/Customer or Admin)
router.get('/', tableController.getTables);

// Add a new table (Protected - Admin only)
router.post('/', authMiddleware, tableController.addTable);

// Toggle a table's status (Protected - Admin only)
router.put('/:id/toggle-status', authMiddleware, tableController.toggleTableStatus);

// Validate QR Code and get customer session token
router.post('/validate-qr', tableController.validateQR);

module.exports = router;
