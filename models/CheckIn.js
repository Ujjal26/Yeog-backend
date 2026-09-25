const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  tableNumber: { 
    type: Number, 
    required: true,
  },
  guestCount: { 
    type: Number, 
    required: true, 
    default: 1,
    min: 1
  },
  status: { 
    type: String, 
    enum: ['active', 'completed'], 
    default: 'active',
    index: true
  },
  checkInTime: { 
    type: Date, 
    default: Date.now 
  },
  checkOutTime: { 
    type: Date 
  }
});

module.exports = mongoose.model('CheckIn', checkInSchema, 'CheckIns');
