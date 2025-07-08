const mongoose = require('mongoose');
const { TournamentType } = require('./dist/models/tournament.model');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority';

// Test user and event IDs (you may need to adjust these)
const TEST_ORGANIZER_ID = '684baaef048914785f2ac472'; // Replace with a valid user ID
const TEST_EVENT_ID = '684b4297048914785f2ac51e'; // Replace with a valid event ID

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createSwissTournament() {
  console.log('\n🏆 Creating Swiss Tournament with 13 players and 4 rounds...\n');

  const Tournament = mongoose.model('Tournament');
  
  // Create tournament
  const tournamentData = {
    name: 'Test Swiss Tournament - 13 Players',
    eventId: new mongoose.Types.ObjectId(TEST_EVENT_ID),
    organizerId: new mongoose.Types.ObjectId(TEST_ORGANIZER_ID),
    type: TournamentType.SWISS,
    maxPlayers: 16,
    numRounds: 4,
    players: [],
    rounds: [],
    isStarted: false,
    isFinished: false,
    registrationOpen: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Add 13 players (mix of registered and guest players)
  for (let i = 1; i <= 13; i++) {
    const player = {
      id: new mongoose.Types.ObjectId().toString(),
      name: `Player ${String.fromCharCode(64 + i)}`, // A, B, C, etc.
      isGuest: i > 8, // Last 5 players are guests
      points: 0,
      wins: 0,
      buchholzScore: 0,
      pastOpponents: []
    };
    
    if (!player.isGuest) {
      player.userId = new mongoose.Types.ObjectId();
      player.username = `player${String.fromCharCode(96 + i)}`; // player_a, player_b, etc.
    }
    
    tournamentData.players.push(player);
  }

  const tournament = new Tournament(tournamentData);
  await tournament.save();

  console.log(`✅ Tournament created with ID: ${tournament._id}`);
  console.log(`📊 Players: ${tournament.players.length}`);
  console.log(`🎯 Rounds: ${tournament.numRounds}`);
  
  return tournament;
}

async function startTournament(tournamentId) {
  console.log('\n🚀 Starting tournament and generating Round 1...\n');
  
  const Tournament = mongoose.model('Tournament');
  const tournament = await Tournament.findById(tournamentId);
  
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  // Import the Swiss strategy
  const { SwissTournamentStrategy } = require('./dist/tournaments/strategies/swiss-tournament.strategy');
  const strategy = new SwissTournamentStrategy();
  
  // Start tournament - this should generate round 1
  const updatedTournament = await strategy.startTournament(tournament);
  await updatedTournament.save();
  
  console.log('✅ Tournament started!');
  console.log(`📊 Round 1 generated with ${updatedTournament.rounds[0].matches.length} matches`);
  console.log(`🎯 Bye player: ${updatedTournament.rounds[0].byePlayers?.map(p => p.name).join(', ') || 'None'}`);
  
  // Display Round 1 pairings
  console.log('\n📋 Round 1 Pairings:');
  updatedTournament.rounds[0].matches.forEach((match, index) => {
    console.log(`  Match ${index + 1}: ${match.player1.name} vs ${match.player2.name}`);
  });
  if (updatedTournament.rounds[0].byePlayers?.length > 0) {
    console.log(`  BYE: ${updatedTournament.rounds[0].byePlayers[0].name}`);
  }
  
  return updatedTournament;
}

async function submitRoundResults(tournamentId, roundNumber, results) {
  console.log(`\n📝 Submitting results for Round ${roundNumber}...\n`);
  
  const Tournament = mongoose.model('Tournament');
  const tournament = await Tournament.findById(tournamentId);
  
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  const round = tournament.rounds[roundNumber - 1];
  if (!round) {
    throw new Error(`Round ${roundNumber} not found`);
  }

  // Import the base tournament service for processing results
  const { BaseTournamentService } = require('./dist/tournaments/services/base-tournament.service');
  const baseTournamentService = new BaseTournamentService(Tournament);

  // Submit results for each match
  for (let i = 0; i < round.matches.length && i < results.length; i++) {
    const match = round.matches[i];
    const result = results[i];
    
    console.log(`  Submitting: ${match.player1.name} vs ${match.player2.name} - ${result.type}`);
    
    if (result.type === 'draw') {
      match.isDraw = true;
      match.result = 'draw';
      match.status = 'completed';
    } else {
      match.winnerId = result.winner === 1 ? match.player1.id : match.player2.id;
      match.loserId = result.winner === 1 ? match.player2.id : match.player1.id;
      match.status = 'completed';
      match.isDraw = false;
    }
  }

  // Mark round as complete
  round.isComplete = true;
  round.completedAt = new Date();
  
  // Save tournament
  await tournament.save();

  // Process round completion - this should trigger next round generation
  const { SwissTournamentStrategy } = require('./dist/tournaments/strategies/swiss-tournament.strategy');
  const strategy = new SwissTournamentStrategy();
  
  // Check if we should advance
  const allMatchesComplete = round.matches.every(m => m.status === 'completed');
  if (allMatchesComplete) {
    console.log('  All matches complete, advancing tournament...');
    const updatedTournament = await strategy.advanceTournament(tournament);
    await updatedTournament.save();
    
    // Display next round pairings if generated
    const nextRoundNumber = roundNumber + 1;
    if (updatedTournament.rounds[nextRoundNumber - 1]) {
      console.log(`\n📋 Round ${nextRoundNumber} Pairings (auto-generated):`);
      updatedTournament.rounds[nextRoundNumber - 1].matches.forEach((match, index) => {
        console.log(`  Match ${index + 1}: ${match.player1.name} vs ${match.player2.name}`);
      });
      if (updatedTournament.rounds[nextRoundNumber - 1].byePlayers?.length > 0) {
        console.log(`  BYE: ${updatedTournament.rounds[nextRoundNumber - 1].byePlayers[0].name}`);
      }
    }
    
    return updatedTournament;
  }
  
  return tournament;
}

async function displayStandings(tournamentId) {
  console.log('\n📊 Current Standings:\n');
  
  const Tournament = mongoose.model('Tournament');
  const tournament = await Tournament.findById(tournamentId);
  
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  // Sort players by points, then by buchholz score
  const sortedPlayers = [...tournament.players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.buchholzScore - a.buchholzScore;
  });

  console.log('Rank | Player | Points | Wins | Buchholz | Opponents');
  console.log('-----|--------|--------|------|----------|----------');
  
  sortedPlayers.forEach((player, index) => {
    const rank = index + 1;
    const opponents = player.pastOpponents.join(', ') || 'None';
    console.log(
      `${rank.toString().padEnd(5)}| ${player.name.padEnd(7)}| ${player.points.toString().padEnd(7)}| ${player.wins.toString().padEnd(5)}| ${player.buchholzScore.toString().padEnd(9)}| ${opponents}`
    );
  });
}

async function runFullTournament() {
  try {
    await connectDB();
    
    // Create tournament
    const tournament = await createSwissTournament();
    
    // Start tournament (generates Round 1)
    const startedTournament = await startTournament(tournament._id);
    
    // Round 1 results - mix of wins, losses, and draws
    console.log('\n=== ROUND 1 RESULTS ===');
    const round1Results = [
      { type: 'win', winner: 1 },  // Match 1: Player A wins
      { type: 'draw' },             // Match 2: Draw
      { type: 'win', winner: 2 },  // Match 3: Player 2 wins
      { type: 'win', winner: 1 },  // Match 4: Player 1 wins
      { type: 'draw' },             // Match 5: Draw
      { type: 'win', winner: 2 },  // Match 6: Player 2 wins
    ];
    
    await submitRoundResults(tournament._id, 1, round1Results);
    await displayStandings(tournament._id);
    
    // Round 2 results
    console.log('\n=== ROUND 2 RESULTS ===');
    const round2Results = [
      { type: 'win', winner: 2 },  // Mix up the results
      { type: 'win', winner: 1 },
      { type: 'draw' },
      { type: 'win', winner: 2 },
      { type: 'draw' },
      { type: 'win', winner: 1 },
    ];
    
    await submitRoundResults(tournament._id, 2, round2Results);
    await displayStandings(tournament._id);
    
    // Round 3 results
    console.log('\n=== ROUND 3 RESULTS ===');
    const round3Results = [
      { type: 'draw' },
      { type: 'win', winner: 1 },
      { type: 'win', winner: 2 },
      { type: 'draw' },
      { type: 'win', winner: 1 },
      { type: 'win', winner: 2 },
    ];
    
    await submitRoundResults(tournament._id, 3, round3Results);
    await displayStandings(tournament._id);
    
    // Round 4 results (final round)
    console.log('\n=== ROUND 4 RESULTS (FINAL) ===');
    const round4Results = [
      { type: 'win', winner: 1 },
      { type: 'win', winner: 2 },
      { type: 'draw' },
      { type: 'win', winner: 1 },
      { type: 'win', winner: 2 },
      { type: 'draw' },
    ];
    
    await submitRoundResults(tournament._id, 4, round4Results);
    await displayStandings(tournament._id);
    
    // Check final tournament state
    const finalTournament = await mongoose.model('Tournament').findById(tournament._id);
    console.log(`\n🏁 Tournament finished: ${finalTournament.isFinished}`);
    console.log(`📊 Total rounds played: ${finalTournament.rounds.length}`);
    console.log(`🏆 Winner: ${finalTournament.winnerId ? finalTournament.players.find(p => p.id === finalTournament.winnerId)?.name : 'Not determined'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Test completed, disconnected from MongoDB');
  }
}

// Run the test
runFullTournament();