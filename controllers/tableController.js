/**
 * @file tableController.js
 * @description Controller handling table initialization, retrieval, manual table creation,
 * status transitions ('available' <-> 'closed'), and QR code validation / customer token generation.
 */

const Table = require('../models/Table');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Validate presence of JWT secret for session generation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');

/**
 * Seeds 8 default dining tables (numbered 1 through 8) with generated random hex QR tokens
 * if the `Tables` collection is currently empty.
 * 
 * @async
 * @function seedTables
 * @returns {Promise<void>}
 */
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

/**
 * Fetches all dining tables sorted in ascending order by table number.
 * 
 * @async
 * @function getTables
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response containing sorted array of tables.
 * @returns {Promise<void>}
 */
exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({ number: 1 });
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Server error while fetching tables' });
  }
};

/**
 * Adds a new dining table to the system with an auto-incremented table number and a unique QR token.
 * 
 * @async
 * @function addTable
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response returning newly created table object.
 * @returns {Promise<void>}
 */
exports.addTable = async (req, res) => {
  try {
    // Find the highest table number currently registered in DB
    const lastTable = await Table.findOne().sort({ number: -1 });
    const nextNumber = lastTable ? lastTable.number + 1 : 1;

    const { name } = req.body;

    const newTable = new Table({
      number: nextNumber,
      name: name ? name.trim() : '',
      status: 'available',
      qrToken: crypto.randomBytes(8).toString('hex'),
    });

    await newTable.save();
    res.status(201).json({ message: 'Table added successfully', table: newTable });

    const io = req.app.get('io');
    if (io) io.emit('table_updated');
  } catch (error) {
    console.error('Error adding table:', error);
    res.status(500).json({ message: 'Server error while adding table' });
  }
};

/**
 * Toggles a table's operational status (e.g. 'available' <-> 'closed').
 * Prevents closing tables that currently have active customers seated.
 * 
 * @async
 * @function toggleTableStatus
 * @param {import('express').Request} req - Express request with table ID in params and target status in body.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.toggleTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Target status: 'closed' or 'available'

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Safety guard: Prevent closing a table that is currently active with active diners
    if (status === 'closed' && table.status === 'active') {
      return res.status(400).json({ message: 'Cannot close a table that is currently active with customers.' });
    }

    table.status = status;
    await table.save();

    res.json({ message: 'Table status updated successfully', table });

    const io = req.app.get('io');
    if (io) io.emit('table_updated');
  } catch (error) {
    console.error('Error toggling table status:', error);
    res.status(500).json({ message: 'Server error while updating table status' });
  }
};

/**
 * Validates table number and scanned QR token.
 * On successful validation, generates a signed 12-hour customer session JWT.
 * 
 * @async
 * @function validateQR
 * @param {import('express').Request} req - Express request containing `tableNumber` and `qrToken` in body.
 * @param {import('express').Response} res - Express response containing customer JWT token and table details.
 * @returns {Promise<void>}
 */
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

    // Verify token matches the assigned table QR token
    if (table.qrToken !== qrToken) {
      return res.status(403).json({ message: 'Invalid QR Code token' });
    }

    const isMenuTable = table.name?.trim().toLowerCase() === 'menu table';

    // Security: Block new QR scans if this table already has an active customer session.
    // This prevents a second person from taking over a table mid-session or accidentally
    // generating a new loginToken that invalidates the current customer's JWT.
    // The table becomes scannable again only after the admin clicks Payment Done (which
    // resets the status to 'available') or after the customer disconnects with no orders.
    if (table.status === 'active' && !isMenuTable) {
      return res.status(403).json({
        message: 'This table is currently occupied. Please wait for the current session to end or ask a staff member for assistance.',
      });
    }

    // Prevent ordering if table is marked closed by admin
    if (table.status === 'closed') {
      return res.status(403).json({ message: 'This table is currently closed.' });
    }

    // For regular tables, generate a fresh loginToken on every QR scan.
    // This rotates the session key, instantly invalidating any previous customer session.
    // For the Menu Table, reuse the existing loginToken so multiple people can view it
    // concurrently without kicking each other out.
    let loginToken = table.loginToken;
    let updatedTable = table;

    if (!isMenuTable || !loginToken) {
      loginToken = crypto.randomBytes(16).toString('hex');

      // Use $set with findOneAndUpdate instead of table.save() to atomically update ONLY
      // the loginToken field. This prevents accidentally overwriting other fields like
      // `status` which the socket handler may have concurrently set to 'active'.
      updatedTable = await Table.findOneAndUpdate(
        { number: Number(table.number) },
        { $set: { loginToken } },
        { new: true }
      );
    }

    // Issue Customer JWT embedding the loginToken — valid for 12 hours.
    // The socket middleware will validate this against the DB on every connection.
    const token = jwt.sign(
      { tableNumber: table.number, role: 'customer', loginToken },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ message: 'QR Code validated successfully', token, table: updatedTable });
  } catch (error) {
    console.error('Error validating QR token:', error);
    res.status(500).json({ message: 'Server error while validating QR' });
  }
};

