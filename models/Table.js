const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    number: {
      type: Number,
      required: true,
      unique: true,
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

// Third argument enforces the collection name to be 'Tables'
module.exports = mongoose.model('Table', tableSchema, 'Tables');
