// Test script to check current round determination logic
console.log('Testing Current Round logic...');

// Simulate checking the tournament management page
const tournamentUrl = 'http://localhost:5173/tournament/single-elimination/687ea05644647c0c8054364b/manage?eventId=687ea04744647c0c8054361b&eventTitle=SET&creatorId=683f542376bb2553a9946fef';

console.log('URL to test:', tournamentUrl);
console.log('Expected behavior:');
console.log('- Current Round should show Round 2 (has real players)');
console.log('- NOT Semi-Final (has TBD players)');
console.log('\nBased on the tournament bracket:');
console.log('Round 2: test5 vs test3, yuri vs B (actionable matches)');
console.log('Semi-Final: TBD vs TBD (waiting for Round 2)');
console.log('\nCheck browser console for debug logs starting with:');
console.log('🔍 Analyzing all rounds for current round determination:');
console.log('🎯 Current Round determined for management:');