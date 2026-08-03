const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // Keeping frontend generated ID for simplicity
    tableNumber: { type: Number, required: true },
    items: [
      {
        id: String,
        name: String,
        price: Number,
        qty: Number,
      },
    ],
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Received', 'Served'],
      default: 'Received',
    },
    timestamp: { type: String }, // Storing formatted time string from frontend
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
