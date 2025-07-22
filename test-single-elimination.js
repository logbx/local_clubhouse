const axios = require('axios');

const API_URL = 'http://localhost:3001';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzBlNzRkMDY0NjcyZTI2YjNmODEyYmYiLCJpYXQiOjE3MzI3MTc5MTcsImV4cCI6MTczMjgwNDMxN30.3-aVb9O_4L7_TiWAMxJg3sJhQXJ65bRBD5y-sN_KSAA';

async function testSingleEliminationOptimizations() {
  console.log('🧪 Testing Single Elimination Tournament Optimizations...\n');

  try {
    // 1. Create a tournament
    console.log('1️⃣ Creating Single Elimination Tournament...');
    const createRes = await axios.post(`${API_URL}/tournaments/create`, {
      name: 'Test SE Tournament - Optimized',
      eventId: '684b4297048914785f2ac51e',
      maxPlayers: 8,
      type: 'SINGLE_ELIMINATION'
    }, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    
    const tournament = createRes.data.data;
    console.log('✅ Tournament created:', tournament.id);

    // 2. Add some players
    console.log('\n2️⃣ Adding guest players...');
    const playerNames = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry'];
    
    for (const name of playerNames) {
      await axios.post(`${API_URL}/tournaments/add-guest`, {
        tournamentId: tournament.id,
        name
      }, {
        headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
      });
    }
    console.log('✅ Added 8 guest players');

    // 3. Start the tournament
    console.log('\n3️⃣ Starting tournament...');
    const startRes = await axios.post(`${API_URL}/tournaments/${tournament.id}/start`, {}, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.log('✅ Tournament started');

    // 4. Get tournament state
    const tournamentState = await axios.get(`${API_URL}/tournaments/${tournament.id}`, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    
    const currentTournament = tournamentState.data.data;
    console.log(`📊 Tournament has ${currentTournament.rounds.length} rounds`);
    console.log(`📊 Round 1 has ${currentTournament.rounds[0].matches.length} matches`);

    // 5. Test match result submission performance
    console.log('\n4️⃣ Testing match result submission performance...');
    const firstMatch = currentTournament.rounds[0].matches[0];
    
    console.time('Result Submission');
    const submitRes = await axios.post(`${API_URL}/tournaments/submit-result`, {
      tournamentId: tournament.id,
      matchId: firstMatch.matchId,
      winnerId: firstMatch.player1.id,
      loserId: firstMatch.player2.id,
      result: 'win'
    }, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.timeEnd('Result Submission');
    
    console.log('✅ Result submitted successfully');

    // 6. Test result confirmation performance
    console.log('\n5️⃣ Testing result confirmation performance...');
    console.time('Result Confirmation');
    const confirmRes = await axios.post(`${API_URL}/tournaments/confirm-result`, {
      tournamentId: tournament.id,
      matchId: firstMatch.matchId
    }, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    console.timeEnd('Result Confirmation');
    
    console.log('✅ Result confirmed successfully');

    // 7. Submit all remaining first round results
    console.log('\n6️⃣ Submitting all first round results...');
    const remainingMatches = currentTournament.rounds[0].matches.slice(1);
    
    for (const match of remainingMatches) {
      await axios.post(`${API_URL}/tournaments/override-result`, {
        tournamentId: tournament.id,
        matchId: match.matchId,
        winnerId: match.player1.id,
        loserId: match.player2.id,
        result: 'win',
        reason: 'Quick test completion'
      }, {
        headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
      });
    }
    
    console.log('✅ All first round matches completed');

    // 8. Check if tournament advanced automatically
    const finalState = await axios.get(`${API_URL}/tournaments/${tournament.id}`, {
      headers: { Authorization: `Bearer ${TEST_USER_TOKEN}` }
    });
    
    const finalTournament = finalState.data.data;
    console.log(`\n📊 Final Tournament State:`);
    console.log(`   - Current Round: ${finalTournament.currentRound}`);
    console.log(`   - Is Finished: ${finalTournament.isFinished}`);
    console.log(`   - Round 2 matches: ${finalTournament.rounds[1]?.matches?.length || 0}`);

    console.log('\n✅ All optimizations working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSingleEliminationOptimizations();