/**
 * @file adminRoutes.js
 * @description Express router defining routes for administrator login and password management.
 * Includes IP-based rate limiting to prevent brute-force login attempts.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

/**
 * Rate limiter middleware for admin authentication.
 * Limits client IP addresses to 10 login attempts within a 15-minute window.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/admin/login
 * @desc    Authenticate admin credentials and obtain JWT token
 * @access  Public (Rate-limited)
 */
router.post('/login', loginLimiter, adminController.login);

/**
 * @route   POST /api/admin/change-password
 * @desc    Update current admin password
 * @access  Private (Requires JWT token)
 */
router.post('/change-password', authMiddleware, adminController.changePassword);

module.exports = router;

