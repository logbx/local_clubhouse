const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

// Create a Swiss tournament for the actual logged-in user
class WorkingTournamentCreator {
  constructor() {
    this.dbClient = null;
    this.db = null;
    this.tournamentId = null;
    this.eventId = null;
    
    // Configure organizerId from command-line args, environment variables, or fallback
    this.organizerId = this.getOrganizerId();
  }

  getOrganizerId() {
    // Check command-line arguments first (node script.js --organizerId=123 or node script.js 123)
    const args = process.argv.slice(2);
    
    // Look for --organizerId=value format
    const argFlag = args.find(arg => arg.startsWith('--organizerId='));
    if (argFlag) {
      const organizerId = argFlag.split('=')[1];
      if (organizerId && organizerId.trim()) {
        console.log(`🔧 Using organizerId from command-line argument: ${organizerId}`);
        return organizerId.trim();
      }
    }
    
    // Look for positional argument (first argument that's not a flag)
    const positionalArg = args.find(arg => !arg.startsWith('--') && arg.trim());
    if (positionalArg) {
      console.log(`🔧 Using organizerId from positional argument: ${positionalArg}`);
      return positionalArg.trim();
    }
    
    // Check environment variable
    if (process.env.TOURNAMENT_ORGANIZER_ID) {
      console.log(`🔧 Using organizerId from environment variable: ${process.env.TOURNAMENT_ORGANIZER_ID}`);
      return process.env.TOURNAMENT_ORGANIZER_ID;
    }
    
    // Fall back to hardcoded value
    const defaultId = '683f542376bb2553a9946fef';
    console.log(`🔧 Using default organizerId: ${defaultId}`);
    return defaultId;
  }

  async connect() {
    try {
      require('dotenv').config({ path: '.env.development' });
      const uri = process.env.MONGODB_URI;
      
      // Validate MongoDB URI
      if (!uri || uri.trim() === '') {
        console.error('❌ MongoDB URI is not defined or empty!');
        console.error('   Please check your .env.development file and ensure MONGODB_URI is set.');
        process.exit(1);
      }
      
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

  async createTestEvent() {
    // Create an event for this user
    const event = {
      _id: uuidv4(),
      title: 'Working Swiss Tournament Test',
      description: 'Swiss tournament that will work with frontend authentication',
      location: 'Online Testing Platform',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      time: '14:00',
      maxAttendees: 20,
      isPublic: true,
      createdBy: this.organizerId,
      attendees: [],
      tags: ['chess', 'tournament', 'swiss', 'testing'],
      eventType: 'tournament',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.eventId = event._id;
    await this.db.collection('events').insertOne(event);
    console.log('🗓️ Created test event:', event.title);
    return event;
  }

  generateTestPlayers() {
    const playerNames = [
      'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince',
      'Edward Norton', 'Fiona Green', 'George Wilson', 'Hannah Lee',
      'Ian McDonald', 'Julia Roberts', 'Kevin Hart', 'Lisa Wang',
      'Mike Johnson'
    ];

    return playerNames.map(name => ({
      id: uuidv4(),
      name: name,
      email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
      isGuest: Math.random() > 0.5,
      userId: Math.random() > 0.5 ? null : uuidv4(),
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      buchholzScore: 0,
      pastOpponents: []
    }));
  }

  async createSwissTournament() {
    const players = this.generateTestPlayers();
    
    const tournament = {
      _id: uuidv4(),
      name: 'Working Frontend Swiss Test',
      description: 'Swiss tournament for authenticated frontend testing',
      type: 'SWISS',
      eventId: this.eventId,
      organizerId: this.organizerId, // Use the actual logged-in user
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
    console.log('   Tournament ID:', this.tournamentId);
    console.log('   Organizer ID:', this.organizerId);
    console.log('   Players:', players.map(p => `${p.name}${p.isGuest ? ' (Guest)' : ''}`).join(', '));
    
    return tournament;
  }

  async startTournament() {
    const tournament = await this.db.collection('tournaments').findOne({ _id: this.tournamentId });
    
    // Sort players alphabetically for first round
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

  displayResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🖥️  WORKING TOURNAMENT - FRONTEND TESTING');
    console.log('='.repeat(80));
    console.log();
    
    console.log('🔧 USAGE - Configure Organizer ID:');
    console.log('   Command-line flag:      node create-working-tournament.js --organizerId=YOUR_USER_ID');
    console.log('   Positional argument:    node create-working-tournament.js YOUR_USER_ID');
    console.log('   Environment variable:   TOURNAMENT_ORGANIZER_ID=YOUR_USER_ID node create-working-tournament.js');
    console.log('   Default (no config):    Uses hardcoded fallback ID');
    console.log();
    
    console.log('🌐 Frontend URLs to test:');
    console.log();
    
    console.log('1. 📊 Tournament Management Page (Organizer View):');
    console.log(`   http://localhost:5173/tournament/swiss/${this.tournamentId}/manage?eventId=${this.eventId}&eventTitle=Working%20Swiss%20Tournament%20Test`);
    console.log('   • This should work without authentication errors');
    console.log('   • Submit match results (wins, losses, draws)');
    console.log('   • See automatic round generation');
    console.log();
    
    console.log('2. 👥 Public Tournament View:');
    console.log(`   http://localhost:5173/tournament/swiss/${this.tournamentId}`);
    console.log();
    
    console.log('3. 🎮 Match Results Page:');
    console.log(`   http://localhost:5173/tournament/swiss/${this.tournamentId}/results`);
    console.log();
    
    console.log('📋 Tournament Details:');
    console.log(`├── Tournament ID: ${this.tournamentId}`);
    console.log(`├── Event ID: ${this.eventId}`);
    console.log(`├── Organizer ID: ${this.organizerId} (Your configured user)`);
    console.log(`├── Players: 13 (mix of registered users and guests)`);
    console.log(`├── Current Round: 1 of 4`);
    console.log(`└── Status: Started and ready for testing`);
    console.log();
    
    console.log('🎯 This tournament should work properly with your authentication!');
    console.log('='.repeat(80));
  }

  async runSetup() {
    try {
      await this.connect();
      
      console.log('🎯 CREATING WORKING SWISS TOURNAMENT\n');
      
      await this.createTestEvent();
      await this.createSwissTournament();
      await this.startTournament();
      
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
    } finally {
      await this.disconnect();
    }
  }
}

// Run the setup
const creator = new WorkingTournamentCreator();
creator.runSetup().catch(console.error);