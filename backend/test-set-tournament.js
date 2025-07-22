const { SingleEliminationFixedStrategy } = require('./dist/tournaments/strategies/single-elimination-fixed.strategy');
const { Types } = require('mongoose');

// Create 17 test players
const createTestPlayers = () => {
  return Array.from({ length: 35 }, (_, i) => ({
    id: new Types.ObjectId().toString(),
    name: String.fromCharCode(65 + i), // A, B, C, etc.
    isGuest: true
  }));
};

// Mock tournament object
const createMockTournament = (players) => ({
  _id: new Types.ObjectId().toString(),
  type: 'SINGLE_ELIMINATION',
  players,
  rounds: [],
  numRounds: Math.ceil(Math.log2(players.length))
});

// Test the tournament progression
const testTournamentProgression = () => {
  console.log('🏆 Testing Single Elimination Tournament with 17 players\n');
  
  // Initialize strategy
  const strategy = new SingleEliminationFixedStrategy();
  
  // Create test players
  const players = createTestPlayers();
  console.log('👥 Created test players:', players.map(p => p.name).join(', '), '\n');
  
  // Create mock tournament
  const tournament = createMockTournament(players);
  console.log('📊 Tournament initialized:', {
    id: tournament._id,
    playerCount: tournament.players.length,
    numRounds: tournament.numRounds
  }, '\n');
  
  // Generate initial structure
  console.log('🔄 Generating initial tournament structure...\n');
  tournament.rounds = strategy.generateInitialStructure(players, tournament);
  
  // Log initial round structure
  console.log('📋 Initial Tournament Structure:');
  tournament.rounds.forEach((round, i) => {
    console.log(`\nRound ${round.roundNumber}:`);
    console.log('Matches:');
    round.matches.forEach(match => {
      console.log(`  ${match.player1.name} vs ${match.player2.name || 'TBD'}`);
    });
    if (round.byePlayers?.length) {
      console.log('Byes:', round.byePlayers.map(p => p.name).join(', '));
    }
  });
  
  // Simulate tournament progression
  console.log('\n🎮 Simulating tournament progression...\n');
  
  // Track bye history
  const byeHistory = new Map();
  
  // Process each round
  for (let roundNumber = 1; roundNumber <= tournament.numRounds; roundNumber++) {
    console.log(`\n=== ROUND ${roundNumber} ===`);
    
    const currentRound = tournament.rounds[roundNumber - 1];
    
    // Complete all matches in current round
    currentRound.matches.forEach(match => {
      if (match.player1.id !== 'TBD' && match.player2.id !== 'TBD') {
        // Randomly select winner
        const winner = Math.random() > 0.5 ? match.player1 : match.player2;
        match.winnerId = winner.id;
        match.status = 'completed';
        console.log(`Match completed: ${match.player1.name} vs ${match.player2.name} → Winner: ${winner.name}`);
      }
    });
    
    // Record byes
    if (currentRound.byePlayers?.length) {
      currentRound.byePlayers.forEach(player => {
        if (!byeHistory.has(player.id)) {
          byeHistory.set(player.id, []);
        }
        byeHistory.get(player.id).push(roundNumber);
        console.log(`🎯 Bye assigned to ${player.name} in Round ${roundNumber}`);
      });
    }
    
    currentRound.isComplete = true;
    
    // Check advancement to next round
    if (roundNumber < tournament.numRounds) {
      console.log('\nChecking advancement...');
      const result = strategy.checkAdvancement(tournament, roundNumber);
      
      if (result.shouldAdvance) {
        console.log('✅ Round advanced successfully');
        
        // Log next round structure
        const nextRound = tournament.rounds[roundNumber];
        console.log('\nNext round structure:');
        nextRound.matches.forEach(match => {
          console.log(`  ${match.player1.name || 'TBD'} vs ${match.player2.name || 'TBD'}`);
        });
        if (nextRound.byePlayers?.length) {
          console.log('Byes:', nextRound.byePlayers.map(p => p.name).join(', '));
        }
      }
    }
  }
  
  // Final bye analysis
  console.log('\n📊 FINAL BYE ANALYSIS:');
  for (const [playerId, rounds] of byeHistory.entries()) {
    const player = tournament.players.find(p => p.id === playerId);
    console.log(`Player ${player.name}: ${rounds.length} bye(s) in round(s):`, rounds.join(', '));
    if (rounds.length > 1) {
      console.error(`❌ VIOLATION: Player ${player.name} received multiple byes!`);
    }
  }
  
  return {
    tournament,
    byeHistory: Object.fromEntries(byeHistory)
  };
};

// Run the test
console.log('🚀 Starting Single Elimination Tournament test...\n');
const result = testTournamentProgression();

// Export result for further analysis if needed
module.exports = result; 