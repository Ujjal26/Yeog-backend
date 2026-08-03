const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public route to get all items
router.get('/', menuController.getAllItems);

// Protected routes
router.post('/', authMiddleware, menuController.addItem);
router.put('/:id', authMiddleware, menuController.updateItem);
router.delete('/:id', authMiddleware, menuController.deleteItem);
router.put('/:id/toggle-availability', authMiddleware, menuController.toggleAvailability);

module.exports = router;
