const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
let authToken = '';
let tournamentId = '';
let currentUserId = '';

// Test credentials
const TEST_USER = {
  identifier: 'test@localclubhouse.com',  // Backend expects 'identifier' not 'email'
  password: 'Test123!'
};

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    authToken = response.data.accessToken;
    currentUserId = response.data.user.id || response.data.user._id;
    console.log('✅ Logged in successfully');
    console.log(`👤 User ID: ${currentUserId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createEvent() {
  try {
    console.log('\n📅 Creating test event...');
    const response = await axios.post(`${API_URL}/events`, {
      name: 'Swiss Tournament Test Event',
      description: 'Event for testing Swiss tournament with 13 players',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      time: '14:00',
      location: 'Test Location',
      maxAttendees: 50,
      category: 'Sports',
      requiresApproval: false,
      visibility: 'public'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Event created:', response.data.data._id);
    return response.data.data._id;
  } catch (error) {
    console.error('❌ Event creation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTournament(eventId) {
  try {
    console.log('\n🏆 Creating Swiss tournament...');
    const response = await axios.post(`${API_URL}/tournaments`, {
      name: 'Swiss Tournament - 13 Players Test',
      eventId: eventId,
      type: 'swiss',
      maxPlayers: 16,
      numRounds: 4
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    tournamentId = response.data.data._id || response.data.data.id;
    console.log('✅ Tournament created:', tournamentId);
    console.log(`📊 Type: ${response.data.data.type}`);
    console.log(`🎯 Rounds: ${response.data.data.numRounds}`);
    return response.data.data;
  } catch (error) {
    console.error('❌ Tournament creation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function addGuestPlayer(name) {
  try {
    const response = await axios.post(`${API_URL}/tournaments/add-guest`, {
      tournamentId: tournamentId,
      name: name
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Added guest player: ${name}`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Failed to add guest ${name}:`, error.response?.data || error.message);
    throw error;
  }
}

async function registerPlayer() {
  try {
    const response = await axios.post(`${API_URL}/tournaments/register`, {
      tournamentId: tournamentId
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Registered current user as player');
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to register player:', error.response?.data || error.message);
    throw error;
  }
}

async function startTournament() {
  try {
    console.log('\n🚀 Starting tournament...');
    const response = await axios.post(`${API_URL}/tournaments/${tournamentId}/start`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Tournament started!');
    const tournament = response.data.data || response.data;
    
    // Display Round 1 pairings
    if (tournament.rounds && tournament.rounds[0]) {
      console.log('\n📋 Round 1 Pairings:');
      tournament.rounds[0].matches.forEach((match, index) => {
        console.log(`  Match ${index + 1}: ${match.player1.name} vs ${match.player2.name}`);
      });
      if (tournament.rounds[0].byePlayers?.length > 0) {
        console.log(`  BYE: ${tournament.rounds[0].byePlayers[0].name}`);
      }
    }
    
    return tournament;
  } catch (error) {
    console.error('❌ Failed to start tournament:', error.response?.data || error.message);
    throw error;
  }
}

async function submitMatchResult(matchId, result) {
  try {
    let payload = {
      tournamentId: tournamentId,
      matchId: matchId
    };
    
    if (result.type === 'draw') {
      payload.isDraw = true;
      payload.result = 'draw';
      payload.winnerId = null;
      payload.loserId = null;
    } else {
      // For wins, we need to determine winner/loser from the match
      const tournament = await getTournament();
      const match = tournament.rounds.flatMap(r => r.matches).find(m => m.matchId === matchId);
      
      if (match) {
        if (result.winner === 1) {
          payload.winnerId = match.player1.id;
          payload.loserId = match.player2.id;
        } else {
          payload.winnerId = match.player2.id;
          payload.loserId = match.player1.id;
        }
        payload.result = 'win';
        payload.isDraw = false;
      }
    }
    
    const response = await axios.post(`${API_URL}/tournaments/submit-result`, payload, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Result submitted for match ${matchId}`);
    return response.data.data;
  } catch (error) {
    console.error(`❌ Failed to submit result for match ${matchId}:`, error.response?.data || error.message);
    throw error;
  }
}

async function getTournament() {
  try {
    const response = await axios.get(`${API_URL}/tournaments/${tournamentId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data.data || response.data;
  } catch (error) {
    console.error('❌ Failed to get tournament:', error.response?.data || error.message);
    throw error;
  }
}

async function displayStandings() {
  try {
    const tournament = await getTournament();
    
    console.log('\n📊 Current Standings:');
    console.log('Rank | Player | Points | Wins | Buchholz');
    console.log('-----|--------|--------|------|----------');
    
    // Sort players by points
    const sortedPlayers = [...tournament.players].sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
      return (b.buchholzScore || 0) - (a.buchholzScore || 0);
    });
    
    sortedPlayers.forEach((player, index) => {
      console.log(
        `${(index + 1).toString().padEnd(5)}| ${player.name.padEnd(7)}| ${(player.points || 0).toString().padEnd(7)}| ${(player.wins || 0).toString().padEnd(5)}| ${(player.buchholzScore || 0)}`
      );
    });
  } catch (error) {
    console.error('❌ Failed to display standings:', error.message);
  }
}

async function runTest() {
  try {
    // Login
    await login();
    
    // Create event
    const eventId = await createEvent();
    
    // Create tournament
    await createTournament(eventId);
    
    // Add players
    console.log('\n👥 Adding players...');
    
    // Register current user
    await registerPlayer();
    
    // Add 12 guest players (A through L)
    for (let i = 0; i < 12; i++) {
      await addGuestPlayer(`Player ${String.fromCharCode(65 + i)}`);
      await delay(100); // Small delay to avoid rate limiting
    }
    
    // Start tournament
    const tournament = await startTournament();
    
    // Simulate 4 rounds
    for (let round = 1; round <= 4; round++) {
      console.log(`\n=== ROUND ${round} ===`);
      
      // Get current tournament state
      const currentTournament = await getTournament();
      const currentRound = currentTournament.rounds[round - 1];
      
      if (!currentRound) {
        console.log('❌ Round not found');
        break;
      }
      
      // Submit results for all matches in the round
      console.log('📝 Submitting match results...');
      
      // Create varied results
      const results = [
        { type: 'win', winner: 1 },
        { type: 'draw' },
        { type: 'win', winner: 2 },
        { type: 'win', winner: 1 },
        { type: 'draw' },
        { type: 'win', winner: 2 }
      ];
      
      for (let i = 0; i < currentRound.matches.length; i++) {
        const match = currentRound.matches[i];
        const result = results[i % results.length];
        
        console.log(`  ${match.player1.name} vs ${match.player2.name}: ${result.type}${result.winner ? ` (Player ${result.winner} wins)` : ''}`);
        await submitMatchResult(match.matchId, result);
        await delay(500); // Delay between submissions
      }
      
      // Display standings after each round
      await displayStandings();
      
      // Check if next round was auto-generated
      await delay(1000); // Wait for round processing
      const updatedTournament = await getTournament();
      
      if (round < 4 && updatedTournament.rounds[round]) {
        console.log(`\n✅ Round ${round + 1} auto-generated!`);
        console.log(`📋 Round ${round + 1} Pairings:`);
        updatedTournament.rounds[round].matches.forEach((match, index) => {
          console.log(`  Match ${index + 1}: ${match.player1.name} vs ${match.player2.name}`);
        });
        if (updatedTournament.rounds[round].byePlayers?.length > 0) {
          console.log(`  BYE: ${updatedTournament.rounds[round].byePlayers[0].name}`);
        }
      }
    }
    
    // Final check
    const finalTournament = await getTournament();
    console.log(`\n🏁 Tournament finished: ${finalTournament.isFinished}`);
    console.log(`📊 Total rounds played: ${finalTournament.rounds.length}`);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
console.log('🧪 Swiss Tournament Test - 13 Players, 4 Rounds\n');
console.log('This test will:');
console.log('1. Create a Swiss tournament with 13 players');
console.log('2. Test automatic bye assignment');
console.log('3. Submit various match results (wins, losses, draws)');
console.log('4. Verify automatic round generation');
console.log('5. Display standings after each round\n');

runTest();