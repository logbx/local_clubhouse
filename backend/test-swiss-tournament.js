const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

// Swiss Tournament Test Script
// Tests 4 rounds with 13 players, focusing on bye assignment and Buchholz scoring

class SwissTournamentTest {
  constructor() {
    this.dbClient = null;
    this.db = null;
    this.tournamentId = null;
  }

  async connect() {
    try {
      // Load environment variables
      require('dotenv').config({ path: '.env.development' });
      
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-app';
      console.log('🔌 Connecting to MongoDB Atlas...');
      console.log('📍 Using URI:', uri.replace(/:[^:]*@/, ':****@')); // Hide password in logs
      
      this.dbClient = new MongoClient(uri);
      await this.dbClient.connect();
      this.db = this.dbClient.db();
      console.log('✅ Connected to MongoDB Atlas');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.dbClient) {
      await this.dbClient.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  // Create 13 test players (alphabetically sorted names for predictable bye testing)
  generateTestPlayers() {
    const players = [
      { name: 'Alice Johnson', email: 'alice@test.com' },
      { name: 'Bob Smith', email: 'bob@test.com' },
      { name: 'Charlie Brown', email: 'charlie@test.com' },
      { name: 'Diana Prince', email: 'diana@test.com' },
      { name: 'Edward Norton', email: 'edward@test.com' },
      { name: 'Fiona Green', email: 'fiona@test.com' },
      { name: 'George Wilson', email: 'george@test.com' },
      { name: 'Hannah Davis', email: 'hannah@test.com' },
      { name: 'Ian Thompson', email: 'ian@test.com' },
      { name: 'Julia Martinez', email: 'julia@test.com' },
      { name: 'Kevin Lee', email: 'kevin@test.com' },
      { name: 'Linda Anderson', email: 'linda@test.com' },
      { name: 'Michael Jordan', email: 'michael@test.com' }
    ];

    return players.map(player => ({
      id: uuidv4(),
      name: player.name,
      email: player.email,
      isGuest: false,
      userId: uuidv4(),
      points: 0,
      wins: 0,
      buchholzScore: 0,
      pastOpponents: []
    }));
  }

  // Create Swiss tournament with 4 rounds
  async createTournament() {
    console.log('🏆 Creating Swiss tournament with 4 rounds...');
    
    const players = this.generateTestPlayers();
    console.log('👥 Generated players:', players.map(p => p.name));

    const tournament = {
      _id: uuidv4(),
      name: 'Swiss Tournament Test - 4 Rounds',
      description: 'Testing Swiss tournament with 13 players and 4 rounds',
      type: 'SWISS',
      status: 'active',
      isStarted: true,
      maxPlayers: 16,
      minPlayers: 4,
      numRounds: 4,
      currentRound: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      players: players,
      rounds: [],
      settings: {
        allowDraws: true,
        allowByes: true
      }
    };

    this.tournamentId = tournament._id;
    
    // Save tournament to database
    await this.db.collection('tournaments').insertOne(tournament);
    console.log('✅ Tournament created with ID:', this.tournamentId);
    
    return tournament;
  }

  // Generate first round pairings
  async generateFirstRound() {
    console.log('\n🔄 ROUND 1: Generating first round pairings...');
    
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    const players = tournament.players;
    
    // Sort players alphabetically for first round (standard Swiss)
    players.sort((a, b) => a.name.localeCompare(b.name));
    
    const matches = [];
    const pairedPlayers = new Set();
    let byePlayer = null;
    
    // If odd number of players, assign bye to first player alphabetically
    if (players.length % 2 === 1) {
      byePlayer = players[0];
      pairedPlayers.add(byePlayer.id);
      byePlayer.points = 1; // Bye gets 1 point
      byePlayer.pastOpponents = ['BYE'];
      console.log('🎯 Round 1 bye assigned to:', byePlayer.name, '(first alphabetically)');
    }
    
    // Pair remaining players
    const availablePlayers = players.filter(p => !pairedPlayers.has(p.id));
    for (let i = 0; i < availablePlayers.length; i += 2) {
      if (i + 1 < availablePlayers.length) {
        const player1 = availablePlayers[i];
        const player2 = availablePlayers[i + 1];
        
        const match = {
          matchId: uuidv4(),
          player1: player1,
          player2: player2,
          status: 'pending',
          round: 1,
          resultReportedBy: []
        };
        
        matches.push(match);
        
        // Update past opponents
        player1.pastOpponents = [...(player1.pastOpponents || []), player2.id];
        player2.pastOpponents = [...(player2.pastOpponents || []), player1.id];
        
        console.log(`🥊 Match: ${player1.name} vs ${player2.name}`);
      }
    }
    
    const round1 = {
      roundNumber: 1,
      matches: matches,
      byePlayers: byePlayer ? [byePlayer] : [],
      isComplete: false
    };
    
    // Update tournament with round 1
    await this.db.collection('tournaments').updateOne(
      { _id: this.tournamentId },
      { 
        $set: { 
          players: players,
          rounds: [round1],
          currentRound: 1
        }
      }
    );
    
    console.log(`✅ Round 1 generated: ${matches.length} matches, ${byePlayer ? 1 : 0} bye`);
    return round1;
  }

  // Simulate match results for a round
  async simulateRoundResults(roundNumber, resultPattern = 'random') {
    console.log(`\n🎮 ROUND ${roundNumber}: Simulating match results...`);
    
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    const round = tournament.rounds.find(r => r.roundNumber === roundNumber);
    
    if (!round) {
      console.error(`❌ Round ${roundNumber} not found!`);
      return;
    }
    
    console.log(`📊 Round ${roundNumber} has ${round.matches.length} matches`);
    
    // Show current standings before matches
    console.log('\n📈 Current standings before matches:');
    const sortedPlayers = [...tournament.players].sort((a, b) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      return a.name.localeCompare(b.name);
    });
    
    sortedPlayers.forEach((player, index) => {
      const byes = (player.pastOpponents || []).filter(o => o === 'BYE').length;
      console.log(`  ${index + 1}. ${player.name}: ${player.points || 0} pts, ${player.wins || 0} wins, ${player.buchholzScore || 0} buchholz, ${byes} byes`);
    });
    
    // Simulate each match
    for (const match of round.matches) {
      let result, winnerId, loserId;
      
      if (resultPattern === 'random') {
        // Random results with 10% chance of draw
        const rand = Math.random();
        if (rand < 0.1) {
          result = 'draw';
          winnerId = null;
          loserId = null;
        } else if (rand < 0.55) {
          result = 'win';
          winnerId = match.player1.id;
          loserId = match.player2.id;
        } else {
          result = 'win';
          winnerId = match.player2.id;
          loserId = match.player1.id;
        }
      } else if (resultPattern === 'alternating') {
        // Alternating wins (player1 wins odd matches, player2 wins even matches)
        const matchIndex = round.matches.indexOf(match);
        if (matchIndex % 2 === 0) {
          result = 'win';
          winnerId = match.player1.id;
          loserId = match.player2.id;
        } else {
          result = 'win';
          winnerId = match.player2.id;
          loserId = match.player1.id;
        }
      }
      
      // Update match result
      match.status = 'completed';
      match.result = result;
      match.winnerId = winnerId;
      match.loserId = loserId;
      match.isDraw = result === 'draw';
      
      // Update player points
      const player1 = tournament.players.find(p => p.id === match.player1.id);
      const player2 = tournament.players.find(p => p.id === match.player2.id);
      
      if (result === 'draw') {
        player1.points = (player1.points || 0) + 0.5;
        player2.points = (player2.points || 0) + 0.5;
        console.log(`🤝 ${match.player1.name} vs ${match.player2.name}: DRAW (both get 0.5 pts)`);
      } else {
        const winner = winnerId === player1.id ? player1 : player2;
        const loser = winnerId === player1.id ? player2 : player1;
        
        winner.points = (winner.points || 0) + 1;
        winner.wins = (winner.wins || 0) + 1;
        
        console.log(`🏆 ${match.player1.name} vs ${match.player2.name}: ${winner.name} WINS (${winner.points} pts)`);
      }
    }
    
    // Calculate Buchholz scores
    this.updateBuchholzScores(tournament.players);
    
    // Mark round as complete
    round.isComplete = true;
    
    // Update tournament in database
    await this.db.collection('tournaments').updateOne(
      { _id: this.tournamentId },
      { 
        $set: { 
          players: tournament.players,
          rounds: tournament.rounds
        }
      }
    );
    
    console.log(`✅ Round ${roundNumber} completed!`);
    
    // Show updated standings
    console.log(`\n📈 Standings after Round ${roundNumber}:`);
    const newStandings = [...tournament.players].sort((a, b) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
      if (buchholzDiff !== 0) return buchholzDiff;
      return a.name.localeCompare(b.name);
    });
    
    newStandings.forEach((player, index) => {
      const byes = (player.pastOpponents || []).filter(o => o === 'BYE').length;
      console.log(`  ${index + 1}. ${player.name}: ${player.points || 0} pts, ${player.wins || 0} wins, ${player.buchholzScore || 0} buchholz, ${byes} byes`);
    });
  }

  // Generate next round pairings
  async generateNextRound(roundNumber) {
    console.log(`\n🔄 ROUND ${roundNumber}: Generating pairings...`);
    
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    const players = tournament.players;
    
    // Update Buchholz scores before pairing
    this.updateBuchholzScores(players);
    
    // Sort players by Swiss ranking (points, then Buchholz, then wins, then name)
    const sortedPlayers = [...players].sort((a, b) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
      if (buchholzDiff !== 0) return buchholzDiff;
      const winsDiff = (b.wins || 0) - (a.wins || 0);
      if (winsDiff !== 0) return winsDiff;
      return a.name.localeCompare(b.name);
    });
    
    console.log('\n📊 Current standings for pairing:');
    sortedPlayers.forEach((player, index) => {
      const byes = (player.pastOpponents || []).filter(o => o === 'BYE').length;
      console.log(`  ${index + 1}. ${player.name}: ${player.points || 0} pts, ${player.wins || 0} wins, ${player.buchholzScore || 0} buchholz, ${byes} byes`);
    });
    
    // Determine bye player (lowest performing player who hasn't had a bye, or fewest byes)
    let byePlayer = null;
    if (players.length % 2 === 1) {
      byePlayer = this.selectByePlayer(sortedPlayers);
      console.log(`🎯 Round ${roundNumber} bye assigned to:`, byePlayer.name);
      
      // Award bye points
      byePlayer.points = (byePlayer.points || 0) + 1;
      byePlayer.pastOpponents = [...(byePlayer.pastOpponents || []), 'BYE'];
    }
    
    // Generate pairings
    const matches = [];
    const pairedPlayers = new Set();
    if (byePlayer) {
      pairedPlayers.add(byePlayer.id);
    }
    
    const availablePlayers = sortedPlayers.filter(p => !pairedPlayers.has(p.id));
    
    // Group players by points and try to pair within groups
    const pointGroups = new Map();
    availablePlayers.forEach(player => {
      const points = player.points || 0;
      if (!pointGroups.has(points)) {
        pointGroups.set(points, []);
      }
      pointGroups.get(points).push(player);
    });
    
    console.log('\n🎲 Pairing within point groups:');
    for (const [points, groupPlayers] of pointGroups) {
      console.log(`  Point group ${points}: ${groupPlayers.length} players`);
    }
    
    // Pair within point groups first
    for (const [points, groupPlayers] of pointGroups) {
      while (groupPlayers.length >= 2 && !pairedPlayers.has(groupPlayers[0].id)) {
        const player1 = groupPlayers.shift();
        if (pairedPlayers.has(player1.id)) continue;
        
        // Find best opponent (haven't played before if possible)
        let opponent = null;
        for (const candidate of groupPlayers) {
          if (!pairedPlayers.has(candidate.id) && 
              !(player1.pastOpponents || []).includes(candidate.id)) {
            opponent = candidate;
            break;
          }
        }
        
        // If no new opponent, take any available in group
        if (!opponent) {
          opponent = groupPlayers.find(p => !pairedPlayers.has(p.id));
        }
        
        if (opponent) {
          const match = {
            matchId: uuidv4(),
            player1: player1,
            player2: opponent,
            status: 'pending',
            round: roundNumber,
            resultReportedBy: []
          };
          
          matches.push(match);
          pairedPlayers.add(player1.id);
          pairedPlayers.add(opponent.id);
          
          // Update past opponents
          player1.pastOpponents = [...(player1.pastOpponents || []), opponent.id];
          opponent.pastOpponents = [...(opponent.pastOpponents || []), player1.id];
          
          // Remove opponent from group
          const opponentIndex = groupPlayers.indexOf(opponent);
          if (opponentIndex > -1) {
            groupPlayers.splice(opponentIndex, 1);
          }
          
          const repeatMatch = (player1.pastOpponents || []).filter(o => o === opponent.id).length > 1;
          console.log(`🥊 Match: ${player1.name} vs ${opponent.name}${repeatMatch ? ' (REPEAT)' : ''}`);
        }
      }
    }
    
    // Pair any remaining players across point groups
    const remainingPlayers = availablePlayers.filter(p => !pairedPlayers.has(p.id));
    console.log(`\n🔄 Cross-group pairing for ${remainingPlayers.length} remaining players`);
    
    while (remainingPlayers.length >= 2) {
      const player1 = remainingPlayers.shift();
      if (pairedPlayers.has(player1.id)) continue;
      
      let opponent = null;
      // Try to find opponent they haven't played
      for (const candidate of remainingPlayers) {
        if (!pairedPlayers.has(candidate.id) && 
            !(player1.pastOpponents || []).includes(candidate.id)) {
          opponent = candidate;
          break;
        }
      }
      
      // If no new opponent, take any available
      if (!opponent) {
        opponent = remainingPlayers.find(p => !pairedPlayers.has(p.id));
      }
      
      if (opponent) {
        const match = {
          matchId: uuidv4(),
          player1: player1,
          player2: opponent,
          status: 'pending',
          round: roundNumber,
          resultReportedBy: []
        };
        
        matches.push(match);
        pairedPlayers.add(player1.id);
        pairedPlayers.add(opponent.id);
        
        // Update past opponents
        player1.pastOpponents = [...(player1.pastOpponents || []), opponent.id];
        opponent.pastOpponents = [...(opponent.pastOpponents || []), player1.id];
        
        // Remove opponent from remaining
        const opponentIndex = remainingPlayers.indexOf(opponent);
        if (opponentIndex > -1) {
          remainingPlayers.splice(opponentIndex, 1);
        }
        
        const repeatMatch = (player1.pastOpponents || []).filter(o => o === opponent.id).length > 1;
        console.log(`🥊 Match: ${player1.name} vs ${opponent.name}${repeatMatch ? ' (REPEAT)' : ''}`);
      }
    }
    
    const newRound = {
      roundNumber: roundNumber,
      matches: matches,
      byePlayers: byePlayer ? [byePlayer] : [],
      isComplete: false
    };
    
    // Update tournament with new round
    tournament.rounds.push(newRound);
    tournament.currentRound = roundNumber;
    
    await this.db.collection('tournaments').updateOne(
      { _id: this.tournamentId },
      { 
        $set: { 
          players: tournament.players,
          rounds: tournament.rounds,
          currentRound: roundNumber
        }
      }
    );
    
    console.log(`✅ Round ${roundNumber} generated: ${matches.length} matches, ${byePlayer ? 1 : 0} bye`);
    return newRound;
  }

  // Select bye player following Swiss rules
  selectByePlayer(sortedPlayers) {
    // Calculate bye counts for each player
    const playersWithByeCount = sortedPlayers.map(player => ({
      player,
      byeCount: (player.pastOpponents || []).filter(o => o === 'BYE').length
    }));
    
    // Find minimum bye count
    const minByeCount = Math.min(...playersWithByeCount.map(p => p.byeCount));
    
    // Get players with minimum bye count
    const candidatesWithMinByes = playersWithByeCount.filter(p => p.byeCount === minByeCount);
    
    // Sort by performance (lowest points, then lowest Buchholz, then lowest wins, then alphabetical)
    const sortedCandidates = candidatesWithMinByes.sort((a, b) => {
      const pointsDiff = (a.player.points || 0) - (b.player.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      
      const buchholzDiff = (a.player.buchholzScore || 0) - (b.player.buchholzScore || 0);
      if (buchholzDiff !== 0) return buchholzDiff;
      
      const winsDiff = (a.player.wins || 0) - (b.player.wins || 0);
      if (winsDiff !== 0) return winsDiff;
      
      return a.player.name.localeCompare(b.player.name);
    });
    
    const selectedCandidate = sortedCandidates[0];
    
    console.log(`🎯 Bye selection: ${selectedCandidate.player.name} (${selectedCandidate.player.points || 0} pts, ${selectedCandidate.byeCount} prev byes)`);
    
    return selectedCandidate.player;
  }

  // Update Buchholz scores
  updateBuchholzScores(players) {
    const playerMap = new Map(players.map(p => [p.id, p]));
    
    for (const player of players) {
      if (!player.pastOpponents || player.pastOpponents.length === 0) {
        player.buchholzScore = 0;
        continue;
      }
      
      const buchholzScore = player.pastOpponents.reduce((sum, opponentId) => {
        if (opponentId === 'BYE') return sum;
        const opponent = playerMap.get(opponentId);
        return sum + (opponent?.points || 0);
      }, 0);
      
      player.buchholzScore = buchholzScore;
    }
  }

  // Run complete tournament simulation
  async runFullTournament() {
    console.log('🚀 Starting Swiss Tournament Simulation');
    console.log('📋 Tournament: 4 rounds, 13 players');
    console.log('🎯 Focus: Bye assignment and Buchholz scoring\n');
    
    try {
      await this.connect();
      
      // Create tournament
      await this.createTournament();
      
      // Generate and simulate each round
      await this.generateFirstRound();
      await this.simulateRoundResults(1, 'random');
      
      for (let round = 2; round <= 4; round++) {
        await this.generateNextRound(round);
        await this.simulateRoundResults(round, 'random');
      }
      
      // Final standings
      console.log('\n🏆 FINAL TOURNAMENT STANDINGS:');
      const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
      
      this.updateBuchholzScores(tournament.players);
      
      const finalStandings = [...tournament.players].sort((a, b) => {
        const pointsDiff = (b.points || 0) - (a.points || 0);
        if (pointsDiff !== 0) return pointsDiff;
        const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
        if (buchholzDiff !== 0) return buchholzDiff;
        const winsDiff = (b.wins || 0) - (a.wins || 0);
        if (winsDiff !== 0) return winsDiff;
        return a.name.localeCompare(b.name);
      });
      
      finalStandings.forEach((player, index) => {
        const byes = (player.pastOpponents || []).filter(o => o === 'BYE').length;
        console.log(`  ${index + 1}. ${player.name}: ${player.points || 0} pts, ${player.wins || 0} wins, ${player.buchholzScore || 0} buchholz, ${byes} byes`);
      });
      
      // Verify bye distribution
      console.log('\n🎯 BYE DISTRIBUTION ANALYSIS:');
      const byeStats = finalStandings.map(player => ({
        name: player.name,
        byeCount: (player.pastOpponents || []).filter(o => o === 'BYE').length,
        points: player.points || 0
      }));
      
      byeStats.forEach(stat => {
        console.log(`  ${stat.name}: ${stat.byeCount} bye(s), ${stat.points} total points`);
      });
      
      // Check for bye distribution fairness
      const byeCounts = byeStats.map(s => s.byeCount);
      const maxByes = Math.max(...byeCounts);
      const minByes = Math.min(...byeCounts);
      
      console.log(`\n📊 BYE FAIRNESS CHECK:`);
      console.log(`  Max byes per player: ${maxByes}`);
      console.log(`  Min byes per player: ${minByes}`);
      console.log(`  Bye distribution spread: ${maxByes - minByes}`);
      
      if (maxByes - minByes <= 1) {
        console.log(`  ✅ FAIR: Bye distribution is fair (spread ≤ 1)`);
      } else {
        console.log(`  ⚠️  UNFAIR: Bye distribution may be unfair (spread > 1)`);
      }
      
      console.log('\n🏁 Tournament simulation completed successfully!');
      
    } catch (error) {
      console.error('❌ Tournament simulation failed:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the test
const test = new SwissTournamentTest();
test.runFullTournament().catch(console.error);