#!/usr/bin/env node

/**
 * Tournament Repair Test Script
 * 
 * Usage:
 *   node test-repair.js [tournament_id]
 *   TOURNAMENT_ID=your_id node test-repair.js
 *   node test-repair.js  # Uses default tournament ID
 * 
 * Examples:
 *   node test-repair.js 507f1f77bcf86cd799439011
 *   TOURNAMENT_ID=507f1f77bcf86cd799439011 node test-repair.js
 */

const http = require('http');

// Get tournament ID from command line argument, environment variable, or use default
const tournamentId = process.argv[2] || process.env.TOURNAMENT_ID || '6868666104360e20344cf90d';

if (process.argv[2]) {
  console.log(`🎯 Using tournament ID from command line: ${tournamentId}`);
} else if (process.env.TOURNAMENT_ID) {
  console.log(`🌍 Using tournament ID from environment variable: ${tournamentId}`);
} else {
  console.log(`📋 Using default tournament ID: ${tournamentId}`);
}

const postData = '';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/tournaments/${tournamentId}/repair-players`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`🔧 Attempting to repair Swiss tournament player inclusion...`);
console.log(`📍 URL: http://localhost:3001${options.path}`);

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('📄 Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
  console.log('💡 Make sure the backend is running with: cd backend && npm run dev');
});

req.write(postData);
req.end();