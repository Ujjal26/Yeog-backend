/**
 * @file backfillQR.js
 * @description Standalone database migration script to generate and populate missing `qrToken` fields
 * for legacy table records in MongoDB. Run manually using `node backfillQR.js`.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Table = require('./models/Table');

// Connect to database and perform migration
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    
    // Find all table records missing the qrToken property
    const tables = await Table.find({ qrToken: { $exists: false } });
    console.log(`Found ${tables.length} tables without qrToken`);
    
    // Generate unique 8-byte random hex token for each unpopulated table
    for (const t of tables) {
      t.qrToken = crypto.randomBytes(8).toString('hex');
      await t.save();
      console.log(`Updated Table ${t.number}`);
    }
    
    console.log('Done backfilling.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });

