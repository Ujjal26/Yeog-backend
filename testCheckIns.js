const mongoose = require('mongoose');
const CheckIn = require('./models/CheckIn');
require('dotenv').config();

const API_URL = 'http://localhost:3000/api/checkins';

async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Clear existing for testing
  await CheckIn.deleteMany({});
  console.log('Cleared CheckIns collection.');

  console.log('\n--- 1. Testing Basic Check-in ---');
  await fetchAPI('', {
    method: 'POST',
    body: JSON.stringify({ tableNumber: 1, guestCount: 4 })
  });
  await fetchAPI('', {
    method: 'POST',
    body: JSON.stringify({ tableNumber: 2, guestCount: 2 })
  });
  
  let countRes = await fetchAPI('/count');
  console.log('Expected count: 6, Actual count:', countRes.count);

  console.log('\n--- 2. Edge Case: Table 1 checks in again without checking out ---');
  await fetchAPI('', {
    method: 'POST',
    body: JSON.stringify({ tableNumber: 1, guestCount: 3 })
  });
  countRes = await fetchAPI('/count');
  console.log('Old Table 1 session should be closed. Expected count: 5 (Table 1 = 3, Table 2 = 2), Actual count:', countRes.count);

  console.log('\n--- 3. Edge Case: Worst-case scenario (Ghost / Stale Check-ins) ---');
  // Create a check-in that happened 5 hours ago
  const staleCheckIn = new CheckIn({
    tableNumber: 99,
    guestCount: 5,
    status: 'active',
    checkInTime: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
  });
  await staleCheckIn.save();
  
  countRes = await fetchAPI('/count');
  console.log('Inserted stale check-in. Current count:', countRes.count); // Should be 10

  console.log('\n--- Running Auto-Cleanup (Fix) ---');
  const cleanupRes = await fetchAPI('/auto-cleanup', { method: 'POST' });
  console.log(cleanupRes.message);

  countRes = await fetchAPI('/count');
  console.log('After cleanup expected count: 5, Actual count:', countRes.count);

  mongoose.disconnect();
}

runTests().catch(console.error);
