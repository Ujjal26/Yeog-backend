const Table = require('../models/Table');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');

// Seed 8 predefined tables if the collection is empty
exports.seedTables = async () => {
  try {
    const count = await Table.countDocuments();
    if (count === 0) {
      const initialTables = [];
      for (let i = 1; i <= 8; i++) {
        const qrToken = crypto.randomBytes(8).toString('hex');
        initialTables.push({ number: i, status: 'available', qrToken });
      }
      await Table.insertMany(initialTables);
      console.log('🌱 8 predefined tables seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding tables:', error);
  }
};

// Get all tables sorted by number
exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({ number: 1 });
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Server error while fetching tables' });
  }
};

// Add a new table
exports.addTable = async (req, res) => {
  try {
    // Find the highest table number currently in the DB
    const lastTable = await Table.findOne().sort({ number: -1 });
    const nextNumber = lastTable ? lastTable.number + 1 : 1;

    const newTable = new Table({
      number: nextNumber,
      status: 'available',
      qrToken: crypto.randomBytes(8).toString('hex'),
    });

    await newTable.save();
    res.status(201).json({ message: 'Table added successfully', table: newTable });
  } catch (error) {
    console.error('Error adding table:', error);
    res.status(500).json({ message: 'Server error while adding table' });
  }
};

// Toggle a table's status (e.g. available <-> closed)
exports.toggleTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g. 'closed' or 'available'

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Prevent closing an active table
    if (status === 'closed' && table.status === 'active') {
      return res.status(400).json({ message: 'Cannot close a table that is currently active with customers.' });
    }

    table.status = status;
    await table.save();

    res.json({ message: 'Table status updated successfully', table });
  } catch (error) {
    console.error('Error toggling table status:', error);
    res.status(500).json({ message: 'Server error while updating table status' });
  }
};

// Validate QR Code and issue customer session token
exports.validateQR = async (req, res) => {
  try {
    const { tableNumber, qrToken } = req.body;
    
    if (!tableNumber || !qrToken) {
      return res.status(400).json({ message: 'Missing table number or token' });
    }

    const table = await Table.findOne({ number: tableNumber });
    
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    if (table.qrToken !== qrToken) {
      return res.status(403).json({ message: 'Invalid QR Code token' });
    }

    if (table.status === 'closed') {
      return res.status(403).json({ message: 'This table is currently closed.' });
    }

    // Issue Customer JWT
    const token = jwt.sign(
      { tableNumber: table.number, role: 'customer', sessionId: crypto.randomBytes(4).toString('hex') },
      JWT_SECRET,
      { expiresIn: '12h' } // 12 hour session
    );

    res.json({ message: 'QR Code validated successfully', token, table: table });
  } catch (error) {
    console.error('Error validating QR token:', error);
    res.status(500).json({ message: 'Server error while validating QR' });
  }
};
