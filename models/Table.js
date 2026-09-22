/**
 * @file Table.js
 * @description Mongoose schema for dining tables in the cafe.
 * Tracks table number, operational status ('available', 'active', 'closed'), and secure QR validation token.
 */

const mongoose = require('mongoose');

/**
 * Table Schema
 * @typedef {Object} Table
 * @property {number} number - Unique numeric identifier of the physical table.
 * @property {string} [name] - Optional human-readable label for the table (e.g. "Counter 1", "Pool Table").
 * @property {'available'|'active'|'closed'} status - Current status of the table.
 * @property {string} qrToken - Cryptographic random hex token encoded into the table's QR code for authentication.
 * @property {Date} createdAt - Mongoose timestamp for table record creation.
 * @property {Date} updatedAt - Mongoose timestamp for table record modification.
 */
const tableSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['available', 'active', 'closed'],
      default: 'available',
    },
    qrToken: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

// Explicitly bind schema to the 'Tables' collection in MongoDB
module.exports = mongoose.model('Table', tableSchema, 'Tables');

