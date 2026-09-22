/**
 * @file seedNamedTables.js
 * @description One-off migration script to add named tables:
 *   Counter 1, Counter 2, Counter 3, Counter 4, Pool Table.
 * Run with: node seedNamedTables.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Table = require('./models/Table');

const NAMED_TABLES = [
  'Counter 1',
  'Counter 2',
  'Counter 3',
  'Counter 4',
  'Pool Table',
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Find current highest table number
  const lastTable = await Table.findOne().sort({ number: -1 });
  let nextNumber = lastTable ? lastTable.number + 1 : 1;

  const toInsert = NAMED_TABLES.map((name) => ({
    number: nextNumber++,
    name,
    status: 'available',
    qrToken: crypto.randomBytes(8).toString('hex'),
  }));

  await Table.insertMany(toInsert);
  console.log(`🌱 Inserted ${toInsert.length} named tables:`);
  toInsert.forEach((t) => console.log(`   Table ${t.number} — ${t.name}`));

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
