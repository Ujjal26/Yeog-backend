/**
 * @file admin.js
 * @description Mongoose schema definition for Admin authentication credentials.
 * Stores administrator account details including hashed passwords and creation timestamps.
 */

const mongoose = require('mongoose');

/**
 * Admin Schema
 * @typedef {Object} Admin
 * @property {string} username - Unique administrator username used for logging in.
 * @property {string} password - Bcrypt hashed password for secure authentication.
 * @property {Date} createdAt - Timestamp when the admin record was created.
 * @property {Date} updatedAt - Timestamp when the admin record was last modified.
 */
const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);