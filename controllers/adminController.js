const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set.');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS);
if (!SALT_ROUNDS) throw new Error('FATAL: SALT_ROUNDS environment variable is not set.');

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

exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    // Hardcode username to 'admin' since there's only one predefined admin
    const username = 'admin';

    const adminUser = await Admin.findOne({ username });
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: adminUser._id, username: adminUser.username },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ message: 'Logged in successfully', token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    const adminUser = await Admin.findById(adminId);
    if (!adminUser) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    adminUser.password = hashedNewPassword;
    await adminUser.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
