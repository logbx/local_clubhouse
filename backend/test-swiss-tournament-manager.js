const { MongoClient, ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

// Swiss Tournament Manager Test
// Simulates a tournament manager's view with:
// - Real-time standings updates
// - Draw results
// - Automatic round generation
// - Console-based tournament dashboard

class SwissTournamentManager {
  constructor() {
    this.dbClient = null;
    this.db = null;
    this.tournamentId = null;
    this.currentRound = 1;
  }

  async connect() {
    try {
      require('dotenv').config({ path: '.env.development' });
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-app';
      console.log('🔌 Connecting to MongoDB Atlas...');
      this.dbClient = new MongoClient(uri);
      await this.dbClient.connect();
      this.db = this.dbClient.db();
      console.log('✅ Connected to MongoDB Atlas\n');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.dbClient) {
      await this.dbClient.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }

  // Create test players
  generateTestPlayers() {
    const players = [
      { name: 'Magnus Carlsen', rating: 2830 },
      { name: 'Fabiano Caruana', rating: 2820 },
      { name: 'Ding Liren', rating: 2810 },
      { name: 'Ian Nepomniachtchi', rating: 2795 },
      { name: 'Wesley So', rating: 2780 },
      { name: 'Hikaru Nakamura', rating: 2775 },
      { name: 'Anish Giri', rating: 2770 },
      { name: 'Levon Aronian', rating: 2765 },
      { name: 'Maxime Vachier-Lagrave', rating: 2760 },
      { name: 'Sergey Karjakin', rating: 2755 },
      { name: 'Viswanathan Anand', rating: 2750 },
      { name: 'Alexander Grischuk', rating: 2745 },
      { name: 'Teimour Radjabov', rating: 2740 }
    ];

    return players.map(player => ({
      id: uuidv4(),
      name: player.name,
      rating: player.rating,
      isGuest: false,
      userId: uuidv4(),
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      buchholzScore: 0,
      pastOpponents: []
    }));
  }

  // Display tournament header
  displayHeader() {
    console.clear();
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║            SWISS TOURNAMENT MANAGER - LIVE DASHBOARD              ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log(`Tournament: World Chess Championship Qualifier`);
    console.log(`Format: Swiss System - 4 Rounds`);
    console.log(`Players: 13 | Time Control: 90+30\n`);
  }

  // Display current standings table
  async displayStandings() {
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    
    // Calculate current standings
    const standings = [...tournament.players].sort((a, b) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
      if (buchholzDiff !== 0) return buchholzDiff;
      const winsDiff = (b.wins || 0) - (a.wins || 0);
      if (winsDiff !== 0) return winsDiff;
      return b.rating - a.rating;
    });

    console.log('📊 CURRENT STANDINGS');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('Rank │ Player                    │ Points │ W-D-L │ Buchholz │ Rating │ Performance');
    console.log('─────┼───────────────────────────┼────────┼───────┼──────────┼────────┼─────────────');
    
    standings.forEach((player, index) => {
      const rank = String(index + 1).padStart(4);
      const name = player.name.padEnd(25);
      const points = String(player.points || 0).padEnd(6);
      const record = `${player.wins || 0}-${player.draws || 0}-${player.losses || 0}`.padEnd(5);
      const buchholz = String(player.buchholzScore || 0).padEnd(8);
      const rating = String(player.rating).padEnd(6);
      const performance = this.calculatePerformance(player, tournament.players);
      
      console.log(`${rank} │ ${name} │ ${points} │ ${record} │ ${buchholz} │ ${rating} │ ${performance}`);
    });
    console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');
  }

  // Calculate performance rating
  calculatePerformance(player, allPlayers) {
    if (!player.pastOpponents || player.pastOpponents.length === 0) return 'N/A';
    
    let totalOpponentRating = 0;
    let validOpponents = 0;
    
    player.pastOpponents.forEach(opponentId => {
      if (opponentId !== 'BYE') {
        const opponent = allPlayers.find(p => p.id === opponentId);
        if (opponent && opponent.rating) {
          totalOpponentRating += opponent.rating;
          validOpponents++;
        }
      }
    });
    
    if (validOpponents === 0) return 'N/A';
    
    const avgOpponentRating = totalOpponentRating / validOpponents;
    const scorePercentage = (player.points || 0) / (player.wins + player.draws + player.losses || 1);
    const performanceRating = Math.round(avgOpponentRating + 400 * (scorePercentage - 0.5));
    
    return String(performanceRating);
  }

  // Display round pairings
  displayPairings(round) {
    console.log(`📋 ROUND ${round.roundNumber} PAIRINGS`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('Board │ White                     │ Black                     │ Result');
    console.log('──────┼───────────────────────────┼───────────────────────────┼─────────────');
    
    round.matches.forEach((match, index) => {
      const board = String(index + 1).padStart(5);
      const white = match.player1.name.padEnd(25);
      const black = match.player2.name.padEnd(25);
      let result = 'In Progress';
      
      if (match.status === 'completed') {
        if (match.isDraw) {
          result = '½ - ½';
        } else if (match.winnerId === match.player1.id) {
          result = '1 - 0';
        } else {
          result = '0 - 1';
        }
      }
      
      console.log(`${board} │ ${white} │ ${black} │ ${result.padEnd(11)}`);
    });
    
    if (round.byePlayers && round.byePlayers.length > 0) {
      console.log('──────┴───────────────────────────┴───────────────────────────┴─────────────');
      console.log(`BYE: ${round.byePlayers[0].name} (receives 1 point)`);
    }
    
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  }

  // Create tournament
  async createTournament() {
    console.log('🏆 Creating Swiss Tournament...\n');
    
    const players = this.generateTestPlayers();
    
    const tournament = {
      _id: uuidv4(),
      name: 'World Chess Championship Qualifier',
      description: 'Swiss System Tournament - 4 Rounds',
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
    
    await this.db.collection('tournaments').insertOne(tournament);
    console.log('✅ Tournament created successfully!\n');
    
    return tournament;
  }

  // Simulate match result with realistic draw probability
  simulateMatchResult(player1, player2) {
    const ratingDiff = Math.abs(player1.rating - player2.rating);
    const drawProbability = Math.max(0.15, Math.min(0.5, 0.3 - ratingDiff / 1000));
    
    const rand = Math.random();
    
    if (rand < drawProbability) {
      return { result: 'draw', winnerId: null, loserId: null, isDraw: true };
    }
    
    // Win probability based on rating
    const expectedScore = 1 / (1 + Math.pow(10, (player2.rating - player1.rating) / 400));
    
    if (Math.random() < expectedScore) {
      return { result: 'win', winnerId: player1.id, loserId: player2.id, isDraw: false };
    } else {
      return { result: 'win', winnerId: player2.id, loserId: player1.id, isDraw: false };
    }
  }

  // Process a single match result
  async processMatchResult(matchId, result, round) {
    const match = round.matches.find(m => m.matchId === matchId);
    if (!match) return;
    
    match.status = 'completed';
    match.result = result.result;
    match.isDraw = result.isDraw;
    match.winnerId = result.winnerId;
    match.loserId = result.loserId;
    
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    const player1 = tournament.players.find(p => p.id === match.player1.id);
    const player2 = tournament.players.find(p => p.id === match.player2.id);
    
    if (result.isDraw) {
      player1.points = (player1.points || 0) + 0.5;
      player2.points = (player2.points || 0) + 0.5;
      player1.draws = (player1.draws || 0) + 1;
      player2.draws = (player2.draws || 0) + 1;
      
      console.log(`🤝 Board ${round.matches.indexOf(match) + 1}: ${match.player1.name} vs ${match.player2.name} - DRAW`);
    } else {
      const winner = result.winnerId === player1.id ? player1 : player2;
      const loser = result.winnerId === player1.id ? player2 : player1;
      
      winner.points = (winner.points || 0) + 1;
      winner.wins = (winner.wins || 0) + 1;
      loser.losses = (loser.losses || 0) + 1;
      
      console.log(`🏆 Board ${round.matches.indexOf(match) + 1}: ${winner.name} defeats ${loser.name}`);
    }
    
    // Update database
    await this.db.collection('tournaments').updateOne(
      { _id: this.tournamentId },
      { 
        $set: { 
          players: tournament.players,
          [`rounds.${tournament.rounds.length - 1}`]: round
        }
      }
    );
  }

  // Check if round is complete and generate next round
  async checkRoundCompletion(round) {
    const allMatchesComplete = round.matches.every(m => m.status === 'completed');
    
    if (allMatchesComplete) {
      console.log(`\n✅ Round ${round.roundNumber} completed!`);
      
      const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
      
      // Update Buchholz scores
      this.updateBuchholzScores(tournament.players);
      
      // Update round status
      round.isComplete = true;
      
      await this.db.collection('tournaments').updateOne(
        { _id: this.tournamentId },
        { 
          $set: { 
            players: tournament.players,
            [`rounds.${tournament.rounds.length - 1}.isComplete`]: true
          }
        }
      );
      
      // Check if tournament is complete
      if (round.roundNumber >= tournament.numRounds) {
        console.log('\n🏁 TOURNAMENT COMPLETE!');
        return true;
      }
      
      // Generate next round automatically
      console.log(`\n🔄 Generating Round ${round.roundNumber + 1}...`);
      await this.generateNextRound(round.roundNumber + 1);
      
      return false;
    }
    
    return false;
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

  // Generate first round
  async generateFirstRound() {
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    const players = [...tournament.players];
    
    // Sort by rating for first round
    players.sort((a, b) => b.rating - a.rating);
    
    const matches = [];
    const pairedPlayers = new Set();
    let byePlayer = null;
    
    // Handle bye for odd number of players
    if (players.length % 2 === 1) {
      byePlayer = players[players.length - 1]; // Lowest rated gets bye in round 1
      pairedPlayers.add(byePlayer.id);
      byePlayer.points = 1;
      byePlayer.pastOpponents = ['BYE'];
    }
    
    // Pair players (1 vs 2, 3 vs 4, etc.)
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
        
        player1.pastOpponents = [player2.id];
        player2.pastOpponents = [player1.id];
      }
    }
    
    const round1 = {
      roundNumber: 1,
      matches: matches,
      byePlayers: byePlayer ? [byePlayer] : [],
      isComplete: false
    };
    
    tournament.rounds = [round1];
    
    await this.db.collection('tournaments').updateOne(
      { _id: this.tournamentId },
      { 
        $set: { 
          players: tournament.players,
          rounds: tournament.rounds
        }
      }
    );
    
    return round1;
  }

  // Generate next round using Swiss pairing
  async generateNextRound(roundNumber) {
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    
    // Update Buchholz scores first
    this.updateBuchholzScores(tournament.players);
    
    // Sort players by Swiss ranking
    const sortedPlayers = [...tournament.players].sort((a, b) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
      if (buchholzDiff !== 0) return buchholzDiff;
      const winsDiff = (b.wins || 0) - (a.wins || 0);
      if (winsDiff !== 0) return winsDiff;
      return b.rating - a.rating;
    });
    
    const matches = [];
    const pairedPlayers = new Set();
    let byePlayer = null;
    
    // Select bye player if odd number
    if (sortedPlayers.length % 2 === 1) {
      // Find player with fewest byes among lowest scorers
      const byeCandidates = [...sortedPlayers].reverse(); // Start from bottom
      byePlayer = byeCandidates.find(p => {
        const byeCount = (p.pastOpponents || []).filter(o => o === 'BYE').length;
        return byeCount === 0;
      }) || byeCandidates[0];
      
      pairedPlayers.add(byePlayer.id);
      byePlayer.points = (byePlayer.points || 0) + 1;
      byePlayer.pastOpponents = [...(byePlayer.pastOpponents || []), 'BYE'];
    }
    
    // Group players by points
    const pointGroups = new Map();
    sortedPlayers.filter(p => !pairedPlayers.has(p.id)).forEach(player => {
      const points = player.points || 0;
      if (!pointGroups.has(points)) {
        pointGroups.set(points, []);
      }
      pointGroups.get(points).push(player);
    });
    
    // Pair within point groups
    for (const [points, groupPlayers] of pointGroups) {
      while (groupPlayers.length >= 2 && !pairedPlayers.has(groupPlayers[0].id)) {
        const player1 = groupPlayers.shift();
        if (pairedPlayers.has(player1.id)) continue;
        
        // Find best opponent (not played before if possible)
        let opponent = null;
        for (const candidate of groupPlayers) {
          if (!pairedPlayers.has(candidate.id) && 
              !(player1.pastOpponents || []).includes(candidate.id)) {
            opponent = candidate;
            break;
          }
        }
        
        if (!opponent && groupPlayers.length > 0) {
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
          
          player1.pastOpponents = [...(player1.pastOpponents || []), opponent.id];
          opponent.pastOpponents = [...(opponent.pastOpponents || []), player1.id];
          
          const opponentIndex = groupPlayers.indexOf(opponent);
          if (opponentIndex > -1) {
            groupPlayers.splice(opponentIndex, 1);
          }
        }
      }
    }
    
    // Pair remaining players across point groups
    const remainingPlayers = sortedPlayers.filter(p => !pairedPlayers.has(p.id));
    while (remainingPlayers.length >= 2) {
      const player1 = remainingPlayers.shift();
      if (pairedPlayers.has(player1.id)) continue;
      
      const opponent = remainingPlayers.find(p => !pairedPlayers.has(p.id));
      
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
        
        player1.pastOpponents = [...(player1.pastOpponents || []), opponent.id];
        opponent.pastOpponents = [...(opponent.pastOpponents || []), player1.id];
        
        const opponentIndex = remainingPlayers.indexOf(opponent);
        if (opponentIndex > -1) {
          remainingPlayers.splice(opponentIndex, 1);
        }
      }
    }
    
    const newRound = {
      roundNumber: roundNumber,
      matches: matches,
      byePlayers: byePlayer ? [byePlayer] : [],
      isComplete: false
    };
    
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
    
    this.currentRound = roundNumber;
    return newRound;
  }

  // Simulate a round with delays
  async simulateRound(round) {
    console.log(`\n⏱️  Round ${round.roundNumber} in progress...\n`);
    
    // Simulate matches finishing at different times
    const matchResults = round.matches.map(match => ({
      matchId: match.matchId,
      result: this.simulateMatchResult(match.player1, match.player2),
      delay: Math.random() * 3000 + 1000 // 1-4 seconds
    }));
    
    // Sort by delay to simulate realistic timing
    matchResults.sort((a, b) => a.delay - b.delay);
    
    for (const { matchId, result, delay } of matchResults) {
      await new Promise(resolve => setTimeout(resolve, delay));
      await this.processMatchResult(matchId, result, round);
      
      // Check if round is complete after each result
      const isComplete = await this.checkRoundCompletion(round);
      if (isComplete) break;
    }
  }

  // Run tournament simulation
  async runTournament() {
    try {
      await this.connect();
      
      // Create tournament
      await this.createTournament();
      
      // Display initial setup
      this.displayHeader();
      await this.displayStandings();
      
      // Generate and display first round
      console.log('🎯 ROUND 1\n');
      const round1 = await this.generateFirstRound();
      this.displayPairings(round1);
      
      // Simulate round 1
      await this.simulateRound(round1);
      
      // Wait and show standings
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.displayHeader();
      await this.displayStandings();
      
      // Rounds 2-4 are generated automatically after each round completes
      for (let i = 2; i <= 4; i++) {
        if (this.currentRound >= i) {
          const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
          const currentRound = tournament.rounds.find(r => r.roundNumber === i);
          
          if (currentRound) {
            console.log(`🎯 ROUND ${i}\n`);
            this.displayPairings(currentRound);
            await this.simulateRound(currentRound);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.displayHeader();
            await this.displayStandings();
          }
        }
      }
      
      // Final results
      console.log('\n🏆 FINAL RESULTS\n');
      const finalTournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
      const winner = [...finalTournament.players].sort((a, b) => {
        const pointsDiff = (b.points || 0) - (a.points || 0);
        if (pointsDiff !== 0) return pointsDiff;
        const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
        if (buchholzDiff !== 0) return buchholzDiff;
        return (b.wins || 0) - (a.wins || 0);
      })[0];
      
      console.log(`🥇 TOURNAMENT WINNER: ${winner.name}`);
      console.log(`   Final Score: ${winner.points} points`);
      console.log(`   Record: ${winner.wins}-${winner.draws}-${winner.losses}`);
      console.log(`   Buchholz: ${winner.buchholzScore}`);
      
      // Statistics
      console.log('\n📊 TOURNAMENT STATISTICS');
      console.log('═══════════════════════════════════════════');
      
      let totalGames = 0;
      let totalDraws = 0;
      finalTournament.rounds.forEach(round => {
        totalGames += round.matches.length;
        totalDraws += round.matches.filter(m => m.isDraw).length;
      });
      
      console.log(`Total Games: ${totalGames}`);
      console.log(`Decisive Games: ${totalGames - totalDraws} (${Math.round((totalGames - totalDraws) / totalGames * 100)}%)`);
      console.log(`Draws: ${totalDraws} (${Math.round(totalDraws / totalGames * 100)}%)`);
      console.log(`Total Byes: ${4} (1 per round due to 13 players)`);
      
    } catch (error) {
      console.error('❌ Tournament error:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the tournament manager simulation
const manager = new SwissTournamentManager();
manager.runTournament().catch(console.error);