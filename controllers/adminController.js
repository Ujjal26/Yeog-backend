/**
 * @file adminController.js
 * @description Controller handling administrator authentication, credential seeding, and password modification.
 */

const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Validate environment variables required for token generation and hashing
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);
if (!SALT_ROUNDS) throw new Error('FATAL: SALT_ROUNDS environment variable is not set.');

/**
 * Seeds a default admin user ('admin') on initial database startup if no admin account exists.
 * 
 * @async
 * @function seedAdmin
 * @returns {Promise<void>}
 */
exports.seedAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;
      if (!defaultPassword) throw new Error('FATAL: ADMIN_DEFAULT_PASSWORD environment variable is not set.');
      
      const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
      await Admin.create({ username: 'admin', password: hashedPassword });
      console.log('🌱 Predefined admin user seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
};

/**
 * Admin login endpoint handler.
 * Verifies the provided password against the stored bcrypt hash for the default admin user.
 * 
 * @async
 * @function login
 * @param {import('express').Request} req - Express request containing `password` in body.
 * @param {import('express').Response} res - Express response returning JSON message and JWT token.
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Hardcode username to 'admin' since there is a single predefined admin user
    const username = 'admin';

    const adminUser = await Admin.findOne({ username });
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Sign JWT token valid for 1 day
    const token = jwt.sign(
      { id: adminUser._id, username: adminUser.username },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ message: 'Logged in successfully', token });
  } catch (err) {
    console.error('Error during admin login:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Changes password for the authenticated admin account.
 * Requires verifying the current password before updating to the new password hash.
 * 
 * @async
 * @function changePassword
 * @param {import('express').Request} req - Express request containing `currentPassword` & `newPassword` in body, and decoded user in `req.user`.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    const adminUser = await Admin.findById(adminId);
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Validate existing password
    const isMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Hash new password and save
    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    adminUser.password = hashedNewPassword;
    await adminUser.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error changing admin password:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

