#!/usr/bin/env node

const http = require('http');

const tournamentId = '6868666104360e20344cf90d';

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