const { SingleEliminationFixedStrategy } = require('./dist/tournaments/strategies/single-elimination-fixed.strategy');
const { Types } = require('mongoose');
const WebSocket = require('ws');

// Mock WebSocket server for testing
const wss = new WebSocket.Server({ port: 3002 });
const connectedClients = new Set();

wss.on('connection', (ws) => {
  connectedClients.add(ws);
  
  ws.on('close', () => {
    connectedClients.delete(ws);
  });
});

// Broadcast tournament updates to all connected clients
const broadcastTournamentUpdate = (data) => {
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Create simulated registered players
const createRegisteredPlayers = () => {
  return Array.from({ length: 33 }, (_, i) => ({
    id: new Types.ObjectId().toString(),
    name: `Player ${i + 1}`,
    email: `player${i + 1}@test.com`,
    isRegistered: true,
    isGuest: false,
    avatar: `https://ui-avatars.com/api/?name=Player+${i + 1}`,
    stats: {
      wins: Math.floor(Math.random() * 10),
      losses: Math.floor(Math.random() * 5),
      draws: Math.floor(Math.random() * 3)
    }
  }));
};

// Mock tournament object
const createMockTournament = (players) => ({
  _id: new Types.ObjectId().toString(),
  type: 'SINGLE_ELIMINATION',
  name: '33-Player SET Tournament',
  eventId: new Types.ObjectId().toString(),
  organizerId: new Types.ObjectId().toString(),
  players,
  rounds: [],
  numRounds: Math.ceil(Math.log2(players.length)),
  registrationOpen: false,
  isStarted: true,
  isFinished: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Simulate match result submission
const submitMatchResult = async (match, submittingPlayer, result) => {
  console.log(`\n🎲 Match Result Submitted by ${submittingPlayer.name}:`, {
    matchId: match.matchId,
    player1: match.player1.name,
    player2: match.player2.name,
    result: result
  });
  
  // Update match status
  match.resultReportedBy = match.resultReportedBy || [];
  match.resultReportedBy.push(submittingPlayer.id);
  
  // Broadcast result submission
  broadcastTournamentUpdate({
    type: 'match-result-submitted',
    matchId: match.matchId,
    submittedBy: submittingPlayer.name,
    needsConfirmation: true
  });
  
  return match;
};

// Simulate match result confirmation
const confirmMatchResult = async (match, confirmingPlayer, result) => {
  console.log(`\n✅ Match Result Confirmed by ${confirmingPlayer.name}:`, {
    matchId: match.matchId,
    player1: match.player1.name,
    player2: match.player2.name,
    result: result
  });
  
  // Update match status
  match.status = 'completed';
  match.winnerId = result.winnerId;
  match.completedAt = new Date();
  
  // Broadcast result confirmation
  broadcastTournamentUpdate({
    type: 'match-result-confirmed',
    matchId: match.matchId,
    confirmedBy: confirmingPlayer.name,
    winner: result.winnerId === match.player1.id ? match.player1.name : match.player2.name
  });
  
  return match;
};

// Test the tournament progression with result submission flow
const testTournamentFlow = async () => {
  console.log('🏆 Testing Single Elimination Tournament Flow with 33 Players\n');
  
  // Initialize strategy
  const strategy = new SingleEliminationFixedStrategy();
  
  // Create registered players
  const players = createRegisteredPlayers();
  console.log('👥 Created registered players:', players.map(p => p.name).join(', '), '\n');
  
  // Create mock tournament
  const tournament = createMockTournament(players);
  console.log('📊 Tournament initialized:', {
    id: tournament._id,
    name: tournament.name,
    playerCount: tournament.players.length,
    numRounds: tournament.numRounds
  }, '\n');
  
  // Generate initial structure
  console.log('🔄 Generating initial tournament structure...\n');
  tournament.rounds = strategy.generateInitialStructure(players, tournament);
  
  // Process each round
  for (let roundNumber = 1; roundNumber <= tournament.numRounds; roundNumber++) {
    console.log(`\n=== ROUND ${roundNumber} ===`);
    const currentRound = tournament.rounds[roundNumber - 1];
    
    // Broadcast round start
    broadcastTournamentUpdate({
      type: 'round-started',
      roundNumber,
      roundName: currentRound.name,
      matches: currentRound.matches.length
    });
    
    // Process each match in the round
    for (const match of currentRound.matches) {
      if (match.player1.id === 'TBD' || match.player2.id === 'TBD') continue;
      
      // Simulate random winner
      const winner = Math.random() > 0.5 ? match.player1 : match.player2;
      const loser = winner.id === match.player1.id ? match.player2 : match.player1;
      
      // Winner submits result
      await submitMatchResult(match, winner, {
        winnerId: winner.id,
        loserId: loser.id,
        score: '2-0' // Simulated score
      });
      
      // Small delay to simulate real-world timing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Loser confirms result
      await confirmMatchResult(match, loser, {
        winnerId: winner.id,
        loserId: loser.id,
        score: '2-0'
      });
      
      console.log(`Match completed: ${match.player1.name} vs ${match.player2.name} → Winner: ${winner.name}`);
    }
    
    // Record byes
    if (currentRound.byePlayers?.length) {
      currentRound.byePlayers.forEach(player => {
        console.log(`🎯 Bye assigned to ${player.name} in Round ${roundNumber}`);
        
        // Broadcast bye assignment
        broadcastTournamentUpdate({
          type: 'bye-assigned',
          roundNumber,
          player: player.name
        });
      });
    }
    
    currentRound.isComplete = true;
    
    // Check advancement to next round
    if (roundNumber < tournament.numRounds) {
      console.log('\nChecking advancement...');
      const result = strategy.checkAdvancement(tournament, roundNumber);
      
      if (result.shouldAdvance) {
        console.log('✅ Round advanced successfully');
        
        // Broadcast round completion
        broadcastTournamentUpdate({
          type: 'round-completed',
          roundNumber,
          nextRoundNumber: roundNumber + 1
        });
        
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
  
  // Tournament completion
  const winner = tournament.rounds[tournament.numRounds - 1].matches[0].winnerId;
  const winnerPlayer = tournament.players.find(p => p.id === winner);
  
  console.log('\n🏆 Tournament Complete!');
  console.log(`Champion: ${winnerPlayer.name}`);
  
  // Broadcast tournament completion
  broadcastTournamentUpdate({
    type: 'tournament-completed',
    tournamentId: tournament._id,
    winner: winnerPlayer.name
  });
  
  // Final bye analysis
  console.log('\n📊 FINAL BYE ANALYSIS:');
  const byeHistory = new Map();
  
  tournament.rounds.forEach((round, i) => {
    if (round.byePlayers?.length) {
      round.byePlayers.forEach(player => {
        if (!byeHistory.has(player.name)) {
          byeHistory.set(player.name, []);
        }
        byeHistory.get(player.name).push(i + 1);
      });
    }
  });
  
  for (const [player, rounds] of byeHistory.entries()) {
    console.log(`${player}: ${rounds.length} bye(s) in round(s):`, rounds.join(', '));
    if (rounds.length > 1) {
      console.error(`❌ VIOLATION: Player ${player} received multiple byes!`);
    }
  }
  
  return {
    tournament,
    byeHistory: Object.fromEntries(byeHistory)
  };
};

// Run the test
console.log('🚀 Starting Single Elimination Tournament test with result submission flow...\n');

testTournamentFlow()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    wss.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    wss.close();
    process.exit(1);
  }); 