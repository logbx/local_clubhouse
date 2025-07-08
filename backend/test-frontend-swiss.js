const { MongoClient, ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

// Frontend Swiss Tournament Test
// Creates a tournament that can be viewed/managed through the frontend
// Provides URLs and instructions for testing the frontend

class FrontendSwissTest {
  constructor() {
    this.dbClient = null;
    this.db = null;
    this.tournamentId = null;
    this.eventId = null;
    this.organizerId = null;
  }

  async connect() {
    try {
      require('dotenv').config({ path: '.env.development' });
      const uri = process.env.MONGODB_URI;
      this.dbClient = new MongoClient(uri);
      await this.dbClient.connect();
      this.db = this.dbClient.db();
      console.log('✅ Connected to MongoDB Atlas\n');
    } catch (error) {
      console.error('❌ Connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.dbClient) await this.dbClient.close();
  }

  // Use the actual logged-in user (organizer)
  async createTestUser() {
    // Use the actual logged-in user from the frontend
    this.organizerId = new ObjectId('683f542376bb2553a9946fef');
    
    const existingUser = await this.db.collection('users').findOne({ _id: this.organizerId });
    if (existingUser) {
      console.log('📝 Using actual logged-in user:', existingUser.email, existingUser.fullName);
      return existingUser;
    }

    throw new Error('Logged-in user not found in database');
  }

  // Create a test event
  async createTestEvent() {
    const event = {
      _id: uuidv4(),
      title: 'Swiss Tournament Championship',
      description: 'Test Swiss tournament for frontend demonstration',
      location: 'Online Tournament Platform',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      time: '10:00',
      maxAttendees: 20,
      isPublic: true,
      createdBy: this.organizerId,
      attendees: [],
      tags: ['chess', 'tournament', 'swiss'],
      eventType: 'tournament',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const existingEvent = await this.db.collection('events').findOne({ 
      title: event.title,
      createdBy: this.organizerId 
    });
    
    if (existingEvent) {
      this.eventId = existingEvent._id;
      console.log('📅 Using existing test event:', existingEvent.title);
      return existingEvent;
    }

    await this.db.collection('events').insertOne(event);
    this.eventId = event._id;
    console.log('🗓️ Created test event:', event.title);
    return event;
  }

  // Create test players
  generateTestPlayers() {
    const playerNames = [
      'Alex Chen', 'Blake Jordan', 'Casey Rivera', 'Drew Martinez',
      'Emery Kim', 'Finley Thompson', 'Grey Anderson', 'Harper Lee',
      'Indie Wilson', 'Jordan Taylor', 'Kelly Brown', 'Logan Davis',
      'Morgan White'
    ];

    return playerNames.map(name => ({
      id: uuidv4(),
      name: name,
      email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
      isGuest: Math.random() > 0.6, // 40% guests, 60% registered users
      userId: Math.random() > 0.6 ? null : uuidv4(),
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      buchholzScore: 0,
      pastOpponents: []
    }));
  }

  // Create Swiss tournament
  async createSwissTournament() {
    const players = this.generateTestPlayers();
    
    const tournament = {
      _id: uuidv4(),
      name: 'Frontend Test Swiss Tournament',
      description: 'Swiss tournament for testing frontend functionality with draws and standings',
      type: 'SWISS',
      eventId: this.eventId,
      organizerId: this.organizerId,
      status: 'active',
      isStarted: false,
      isFinished: false,
      isRegistrationOpen: true,
      maxPlayers: 16,
      minPlayers: 4,
      numRounds: 4,
      currentRound: 0,
      players: players,
      rounds: [],
      settings: {
        allowDraws: true,
        allowByes: true,
        pointsPerWin: 1,
        pointsPerDraw: 0.5,
        pointsPerLoss: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tournamentId = tournament._id;
    await this.db.collection('tournaments').insertOne(tournament);
    
    console.log('🏆 Created Swiss tournament with', players.length, 'players');
    console.log('   Players:', players.map(p => `${p.name}${p.isGuest ? ' (Guest)' : ''}`).join(', '));
    
    return tournament;
  }

  // Start the tournament and create first round
  async startTournament() {
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    
    // Sort players by name for first round pairing
    const players = [...tournament.players].sort((a, b) => a.name.localeCompare(b.name));
    
    const matches = [];
    const pairedPlayers = new Set();
    let byePlayer = null;
    
    // Handle bye for odd number of players
    if (players.length % 2 === 1) {
      byePlayer = players[0]; // First alphabetically gets bye in round 1
      pairedPlayers.add(byePlayer.id);
      byePlayer.points = 1;
      byePlayer.pastOpponents = ['BYE'];
    }
    
    // Pair remaining players
    const availablePlayers = players.filter(p => !pairedPlayers.has(p.id));
    for (let i = 0; i < availablePlayers.length; i += 2) {
      if (i + 1 < availablePlayers.length) {
        const p1 = availablePlayers[i];
        const p2 = availablePlayers[i + 1];
        
        matches.push({
          matchId: uuidv4(),
          player1: p1,
          player2: p2,
          status: 'pending',
          round: 1,
          resultReportedBy: []
        });
        
        p1.pastOpponents = [...(p1.pastOpponents || []), p2.id];
        p2.pastOpponents = [...(p2.pastOpponents || []), p1.id];
      }
    }
    
    const round1 = {
      roundNumber: 1,
      matches: matches,
      byePlayers: byePlayer ? [byePlayer] : [],
      isComplete: false
    };
    
    // Update tournament
    await this.db.collection('tournaments').updateOne(
      { _id: this.tournamentId },
      { 
        $set: { 
          isStarted: true,
          currentRound: 1,
          players: players,
          rounds: [round1],
          updatedAt: new Date()
        }
      }
    );
    
    console.log('🚀 Tournament started with Round 1');
    console.log('   Matches:', matches.length);
    console.log('   Bye player:', byePlayer ? byePlayer.name : 'None');
    
    return round1;
  }

  // Simulate some match results
  async simulatePartialResults() {
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    const round1 = tournament.rounds[0];
    
    // Submit results for first 2 matches (mix of wins and draws)
    const resultsToSubmit = [
      { matchIndex: 0, result: 'draw' },
      { matchIndex: 1, result: 'win', winnerIndex: 0 } // player1 wins
    ];
    
    console.log('\n🎮 Simulating partial match results...');
    
    for (const { matchIndex, result, winnerIndex } of resultsToSubmit) {
      if (matchIndex < round1.matches.length) {
        const match = round1.matches[matchIndex];
        const player1 = tournament.players.find(p => p.id === match.player1.id);
        const player2 = tournament.players.find(p => p.id === match.player2.id);
        
        match.status = 'completed';
        match.result = result;
        match.isDraw = result === 'draw';
        
        if (result === 'draw') {
          match.winnerId = null;
          match.loserId = null;
          player1.points = (player1.points || 0) + 0.5;
          player2.points = (player2.points || 0) + 0.5;
          player1.draws = (player1.draws || 0) + 1;
          player2.draws = (player2.draws || 0) + 1;
          console.log(`   🤝 ${match.player1.name} vs ${match.player2.name}: DRAW`);
        } else {
          const winner = winnerIndex === 0 ? player1 : player2;
          const loser = winnerIndex === 0 ? player2 : player1;
          
          match.winnerId = winner.id;
          match.loserId = loser.id;
          
          winner.points = (winner.points || 0) + 1;
          winner.wins = (winner.wins || 0) + 1;
          loser.losses = (loser.losses || 0) + 1;
          
          console.log(`   🏆 ${winner.name} defeats ${loser.name}`);
        }
      }
    }
    
    // Update Buchholz scores
    const playerMap = new Map(tournament.players.map(p => [p.id, p]));
    tournament.players.forEach(player => {
      let buchholz = 0;
      (player.pastOpponents || []).forEach(oppId => {
        if (oppId !== 'BYE') {
          const opp = playerMap.get(oppId);
          buchholz += (opp?.points || 0);
        }
      });
      player.buchholzScore = buchholz;
    });
    
    await this.db.collection('tournaments').updateOne(
      { _id: this.tournamentId },
      { 
        $set: { 
          players: tournament.players,
          rounds: tournament.rounds,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('✅ Updated tournament with partial results');
  }

  // Display frontend URLs and instructions
  displayFrontendInstructions() {
    console.log('\n' + '='.repeat(80));
    console.log('🖥️  FRONTEND TESTING INSTRUCTIONS');
    console.log('='.repeat(80));
    console.log();
    
    console.log('🌐 Frontend URLs to test:');
    console.log();
    
    console.log('1. 📊 Tournament Management Page (Organizer View):');
    console.log(`   http://localhost:5173/tournament/swiss/${this.tournamentId}/manage`);
    console.log('   • View live standings with draws and Buchholz scores');
    console.log('   • Submit match results (wins, losses, draws)');
    console.log('   • See automatic round generation when round completes');
    console.log();
    
    console.log('2. 👥 Public Tournament View:');
    console.log(`   http://localhost:5173/tournament/swiss/${this.tournamentId}`);
    console.log('   • View current standings');
    console.log('   • See match pairings');
    console.log('   • Player view of tournament');
    console.log();
    
    console.log('3. 🎮 Match Results Page:');
    console.log(`   http://localhost:5173/tournament/swiss/${this.tournamentId}/results`);
    console.log('   • Player interface for submitting match results');
    console.log('   • Test draw submissions');
    console.log();
    
    console.log('🔧 Test Actions:');
    console.log('├── ✅ Submit remaining match results in Round 1');
    console.log('├── 🎯 Verify standings update in real-time');
    console.log('├── 🤝 Submit draws and verify 0.5 point scoring');
    console.log('├── 📊 Check Buchholz score calculations');
    console.log('├── ⚡ Verify automatic Round 2 generation');
    console.log('└── 🏆 Complete tournament and view final standings');
    console.log();
    
    console.log('📋 Tournament Details:');
    console.log(`├── Tournament ID: ${this.tournamentId}`);
    console.log(`├── Event ID: ${this.eventId}`);
    console.log(`├── Organizer ID: ${this.organizerId}`);
    console.log(`├── Players: ${13} (mix of registered users and guests)`);
    console.log(`├── Current Round: 1 of 4`);
    console.log(`├── Matches in Round 1: ${6}`);
    console.log(`├── Partial Results: 2 matches completed (1 draw, 1 win)`);
    console.log(`└── Remaining Matches: ${4} pending results`);
    console.log();
    
    console.log('🔍 What to observe in frontend:');
    console.log('• Real-time standings updates after submitting results');
    console.log('• Draw results showing 0.5 points for both players');
    console.log('• Buchholz score calculations (sum of opponents\' scores)');
    console.log('• Automatic round generation when all matches complete');
    console.log('• Bye player getting 1 point automatically');
    console.log('• W-D-L record tracking');
    console.log('• Tournament progression from Round 1 to Round 4');
    console.log();
    
    console.log('⚠️  Note: You may need to refresh the browser after submitting');
    console.log('   results to see the latest standings updates.');
    console.log();
    console.log('🎯 Primary test: Submit all remaining Round 1 results and');
    console.log('   verify Round 2 generates automatically!');
    console.log('='.repeat(80));
  }

  async runTest() {
    try {
      await this.connect();
      
      console.log('🎯 CREATING SWISS TOURNAMENT FOR FRONTEND TESTING\n');
      
      // Create test data
      await this.createTestUser();
      await this.createTestEvent();
      await this.createSwissTournament();
      await this.startTournament();
      await this.simulatePartialResults();
      
      // Display instructions
      this.displayFrontendInstructions();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the frontend test setup
const test = new FrontendSwissTest();
test.runTest().catch(console.error);