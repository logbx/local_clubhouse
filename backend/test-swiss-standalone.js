const { v4: uuidv4 } = require('uuid');

// Import the Swiss tournament strategy and pairing service
// This is a standalone test that doesn't require MongoDB

// Mock the tournament models and interfaces
const TournamentType = {
  SWISS: 'SWISS',
  SINGLE_ELIMINATION: 'SINGLE_ELIMINATION'
};

// Enhanced Swiss Pairing Service (standalone version)
class EnhancedSwissPairingService {
  static generateSwissPairings(players, roundNumber, options = {}) {
    console.log('🎯 EnhancedSwissPairingService.generateSwissPairings called:', {
      playerCount: players.length,
      roundNumber,
      options
    });

    const {
      allowRepeatPairings = false,
      maxPointSpread = 2,
    } = options;

    // Initialize players with Swiss fields
    const initializedPlayers = players.map(player => ({
      ...player,
      points: player.points || 0,
      wins: player.wins || 0,
      buchholzScore: player.buchholzScore || 0,
      pastOpponents: player.pastOpponents || []
    }));

    // Sort players by Swiss ranking
    const sortedPlayers = this.sortPlayersBySwissRanking(initializedPlayers);
    
    const matches = [];
    const paired = new Set();
    let byePlayers;

    // Handle bye player first (odd number of players)
    if (sortedPlayers.length % 2 === 1) {
      this.updateBuchholzScores(sortedPlayers);
      const currentStandings = this.sortPlayersBySwissRanking(sortedPlayers);
      
      console.log('🔄 Current standings for bye selection:', currentStandings.map((p, index) => ({
        rank: index + 1,
        name: p.name,
        points: p.points || 0,
        wins: p.wins || 0,
        buchholz: p.buchholzScore || 0,
        byes: (p.pastOpponents || []).filter(o => o === 'BYE').length
      })));
      
      const byePlayer = this.selectByePlayer(currentStandings);
      if (byePlayer) {
        byePlayers = [byePlayer];
        paired.add(byePlayer.id);
        
        // Award bye points
        byePlayer.points = (byePlayer.points || 0) + 1;
        byePlayer.pastOpponents = [...(byePlayer.pastOpponents || []), 'BYE'];
        
        console.log('✅ Bye awarded to:', {
          name: byePlayer.name,
          newPoints: byePlayer.points,
          totalByes: (byePlayer.pastOpponents || []).filter(o => o === 'BYE').length,
          reason: 'Dynamic selection based on current standings'
        });
      }
    }

    // Generate pairings for remaining players
    const playersForPairing = sortedPlayers.filter(p => !paired.has(p.id));
    
    const pairings = this.generateOptimalPairings(
      playersForPairing,
      allowRepeatPairings,
      maxPointSpread
    );

    // Create match objects
    for (const [player1, player2] of pairings) {
      const match = {
        matchId: uuidv4(),
        player1,
        player2,
        status: 'pending',
        resultReportedBy: [],
        round: roundNumber
      };

      matches.push(match);
      
      // Update past opponents
      player1.pastOpponents = [...(player1.pastOpponents || []), player2.id];
      player2.pastOpponents = [...(player2.pastOpponents || []), player1.id];
    }

    return {
      roundNumber,
      matches,
      byePlayers,
      isComplete: false
    };
  }

  static sortPlayersBySwissRanking(players) {
    return [...players].sort((a, b) => {
      // 1. Sort by points (highest first)
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;

      // 2. Sort by Buchholz score
      const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
      if (buchholzDiff !== 0) return buchholzDiff;

      // 3. Sort by wins
      const winsDiff = (b.wins || 0) - (a.wins || 0);
      if (winsDiff !== 0) return winsDiff;

      // 4. Sort alphabetically
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  static selectByePlayer(sortedPlayers) {
    if (sortedPlayers.length === 0) return null;

    const playersWithByeCount = sortedPlayers.map(player => {
      const byeCount = (player.pastOpponents || []).filter(opponent => opponent === 'BYE').length;
      return {
        player,
        byeCount,
        hasHadBye: byeCount > 0
      };
    });

    console.log('🔍 Selecting bye player from:', playersWithByeCount.map(p => ({ 
      name: p.player.name, 
      points: p.player.points || 0, 
      wins: p.player.wins || 0,
      buchholz: p.player.buchholzScore || 0,
      byeCount: p.byeCount
    })));

    const minByeCount = Math.min(...playersWithByeCount.map(p => p.byeCount));
    const candidatesWithMinByes = playersWithByeCount.filter(p => p.byeCount === minByeCount);
    
    console.log('📊 Bye selection analysis:', {
      minByeCount,
      candidatesCount: candidatesWithMinByes.length,
      candidates: candidatesWithMinByes.map(c => ({
        name: c.player.name,
        points: c.player.points || 0,
        wins: c.player.wins || 0,
        buchholz: c.player.buchholzScore || 0,
        byeCount: c.byeCount
      }))
    });

    // Sort by lowest points, then lowest Buchholz, then lowest wins, then alphabetical
    const sortedCandidates = candidatesWithMinByes.sort((a, b) => {
      const pointsDiff = (a.player.points || 0) - (b.player.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      
      const buchholzDiff = (a.player.buchholzScore || 0) - (b.player.buchholzScore || 0);
      if (buchholzDiff !== 0) return buchholzDiff;
      
      const winsDiff = (a.player.wins || 0) - (b.player.wins || 0);
      if (winsDiff !== 0) return winsDiff;
      
      return (a.player.name || '').localeCompare(b.player.name || '');
    });
    
    const selectedCandidate = sortedCandidates[0];
    
    if (selectedCandidate) {
      console.log('✅ Selected bye player:', {
        name: selectedCandidate.player.name,
        points: selectedCandidate.player.points || 0,
        wins: selectedCandidate.player.wins || 0,
        buchholz: selectedCandidate.player.buchholzScore || 0,
        byeCount: selectedCandidate.byeCount,
        reason: selectedCandidate.byeCount === 0 ? 'never had bye + lowest performance' : `fewest byes (${selectedCandidate.byeCount}) + lowest performance`
      });
      return selectedCandidate.player;
    }

    return null;
  }

  static generateOptimalPairings(players, allowRepeatPairings, maxPointSpread) {
    console.log('🎯 generateOptimalPairings called with:', {
      playerCount: players.length,
      allowRepeatPairings,
      maxPointSpread
    });

    const pairings = [];
    const available = new Set(players.map(p => p.id));

    // Group players by points
    const pointGroups = this.groupPlayersByPoints(players);
    
    console.log('🔍 Point groups:', Array.from(pointGroups.entries()).map(([points, groupPlayers]) => ({ 
      points, 
      playerCount: groupPlayers.length,
      players: groupPlayers.map(p => p.name)
    })));
    
    // Pair within point groups first
    for (const [points, playersInGroup] of pointGroups) {
      console.log(`🔄 Processing point group ${points} with ${playersInGroup.length} players`);
      this.pairWithinGroup(playersInGroup, available, pairings, allowRepeatPairings);
    }

    // Handle remaining players across point groups
    const remainingPlayers = players.filter(p => available.has(p.id));
    console.log(`🔄 Cross-group pairing for ${remainingPlayers.length} remaining players`);
    this.pairAcrossGroups(remainingPlayers, available, pairings, allowRepeatPairings, maxPointSpread);

    return pairings;
  }

  static groupPlayersByPoints(players) {
    const groups = new Map();
    
    for (const player of players) {
      const points = player.points || 0;
      if (!groups.has(points)) {
        groups.set(points, []);
      }
      groups.get(points).push(player);
    }

    return groups;
  }

  static pairWithinGroup(players, available, pairings, allowRepeatPairings) {
    const groupPlayers = players.filter(p => available.has(p.id));
    
    while (groupPlayers.length >= 2) {
      const player1 = groupPlayers.shift();
      if (!available.has(player1.id)) continue;

      const opponent = this.findBestOpponent(player1, groupPlayers, allowRepeatPairings);
      
      if (opponent) {
        console.log(`✅ Pairing ${player1.name} vs ${opponent.name}`);
        pairings.push([player1, opponent]);
        available.delete(player1.id);
        available.delete(opponent.id);
        
        const opponentIndex = groupPlayers.indexOf(opponent);
        if (opponentIndex > -1) {
          groupPlayers.splice(opponentIndex, 1);
        }
      } else {
        break;
      }
    }
  }

  static pairAcrossGroups(players, available, pairings, allowRepeatPairings, maxPointSpread) {
    const remainingPlayers = players.filter(p => available.has(p.id));
    
    while (remainingPlayers.length >= 2) {
      const player1 = remainingPlayers.shift();
      if (!available.has(player1.id)) continue;

      // Try to find opponent within point spread
      const validOpponents = remainingPlayers.filter(p => 
        available.has(p.id) && 
        Math.abs((p.points || 0) - (player1.points || 0)) <= maxPointSpread
      );

      let opponent = this.findBestOpponent(player1, validOpponents, allowRepeatPairings);
      
      // If no opponent within spread, try any available
      if (!opponent && remainingPlayers.length > 0) {
        const anyOpponents = remainingPlayers.filter(p => available.has(p.id));
        opponent = this.findBestOpponent(player1, anyOpponents, allowRepeatPairings);
      }
      
      if (opponent) {
        pairings.push([player1, opponent]);
        available.delete(player1.id);
        available.delete(opponent.id);
        
        const opponentIndex = remainingPlayers.indexOf(opponent);
        if (opponentIndex > -1) {
          remainingPlayers.splice(opponentIndex, 1);
        }
        
        console.log(`✅ Paired ${player1.name} vs ${opponent.name} (points: ${player1.points || 0} vs ${opponent.points || 0})`);
      } else {
        break;
      }
    }
  }

  static findBestOpponent(player, candidates, allowRepeatPairings) {
    if (candidates.length === 0) return null;

    // Try to find opponent they haven't played
    if (!allowRepeatPairings) {
      const newOpponents = candidates.filter(candidate => 
        !player.pastOpponents?.includes(candidate.id)
      );
      
      if (newOpponents.length > 0) {
        return newOpponents[0];
      }
    }

    // Return any available opponent
    return candidates[0];
  }

  static updateBuchholzScores(players) {
    const playerMap = new Map(players.map(p => [p.id, p]));

    for (const player of players) {
      if (!player.pastOpponents || player.pastOpponents.length === 0) {
        player.buchholzScore = 0;
        continue;
      }

      const buchholzScore = player.pastOpponents.reduce((sum, opponentId) => {
        if (opponentId === 'BYE') return sum;
        const opponent = playerMap.get(opponentId);
        const opponentPoints = opponent?.points || 0;
        return sum + opponentPoints;
      }, 0);

      player.buchholzScore = buchholzScore;
    }
  }

  static calculateStandings(players) {
    const validatedPlayers = players.map(player => ({
      ...player,
      points: player.points || 0,
      wins: player.wins || 0,
      buchholzScore: player.buchholzScore || 0,
      pastOpponents: player.pastOpponents || []
    }));
    
    this.updateBuchholzScores(validatedPlayers);
    return this.sortPlayersBySwissRanking(validatedPlayers);
  }
}

// Swiss Tournament Test (standalone)
class SwissTournamentStandaloneTest {
  constructor() {
    this.tournament = null;
  }

  // Create 13 test players
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

  // Create tournament
  createTournament() {
    console.log('🏆 Creating Swiss tournament with 4 rounds...');
    
    const players = this.generateTestPlayers();
    console.log('👥 Generated players:', players.map(p => p.name));

    this.tournament = {
      id: uuidv4(),
      name: 'Swiss Tournament Test - 4 Rounds',
      type: 'SWISS',
      numRounds: 4,
      currentRound: 1,
      players: players,
      rounds: []
    };

    return this.tournament;
  }

  // Generate round pairings
  generateRound(roundNumber) {
    console.log(`\n🔄 ROUND ${roundNumber}: Generating pairings...`);
    
    const options = {
      allowRepeatPairings: roundNumber > 2,
      maxPointSpread: 3
    };

    const round = EnhancedSwissPairingService.generateSwissPairings(
      this.tournament.players,
      roundNumber,
      options
    );

    // CRITICAL FIX: Update tournament players with any bye points that were awarded
    if (round.byePlayers && round.byePlayers.length > 0) {
      for (const byePlayer of round.byePlayers) {
        const tournamentPlayer = this.tournament.players.find(p => p.id === byePlayer.id);
        if (tournamentPlayer) {
          // Sync the bye player's updated stats back to the tournament
          tournamentPlayer.points = byePlayer.points;
          tournamentPlayer.pastOpponents = byePlayer.pastOpponents;
          console.log('🔄 SYNC: Updated tournament player with bye stats:', {
            name: tournamentPlayer.name,
            points: tournamentPlayer.points,
            byes: (tournamentPlayer.pastOpponents || []).filter(o => o === 'BYE').length
          });
        }
      }
    }

    // Update tournament
    this.tournament.rounds.push(round);
    
    console.log(`✅ Round ${roundNumber} generated: ${round.matches.length} matches, ${round.byePlayers?.length || 0} byes`);
    
    // Show matches
    round.matches.forEach(match => {
      console.log(`🥊 Match: ${match.player1.name} vs ${match.player2.name}`);
    });
    
    if (round.byePlayers?.length > 0) {
      round.byePlayers.forEach(player => {
        console.log(`🎯 Bye: ${player.name} (${player.points} pts total)`);
      });
    }
    
    return round;
  }

  // Simulate match results
  simulateMatchResults(roundNumber) {
    console.log(`\n🎮 ROUND ${roundNumber}: Simulating match results...`);
    
    const round = this.tournament.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) {
      console.error(`❌ Round ${roundNumber} not found!`);
      return;
    }

    // Show current standings
    console.log('\n📈 Current standings before matches:');
    this.showStandings();
    
    // DEBUG: Check bye player points before matches
    if (round.byePlayers?.length > 0) {
      console.log('🔍 DEBUG: Bye player before matches:', {
        name: round.byePlayers[0].name,
        points: round.byePlayers[0].points,
        byes: (round.byePlayers[0].pastOpponents || []).filter(o => o === 'BYE').length
      });
    }

    // Simulate each match
    for (const match of round.matches) {
      // Random result with 15% chance of draw
      const rand = Math.random();
      let result, winnerId, loserId;
      
      if (rand < 0.15) {
        result = 'draw';
        winnerId = null;
        loserId = null;
      } else if (rand < 0.575) {
        result = 'win';
        winnerId = match.player1.id;
        loserId = match.player2.id;
      } else {
        result = 'win';
        winnerId = match.player2.id;
        loserId = match.player1.id;
      }
      
      // Update match
      match.status = 'completed';
      match.result = result;
      match.winnerId = winnerId;
      match.loserId = loserId;
      match.isDraw = result === 'draw';
      
      // Update player points
      const player1 = this.tournament.players.find(p => p.id === match.player1.id);
      const player2 = this.tournament.players.find(p => p.id === match.player2.id);
      
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

    // Update Buchholz scores
    EnhancedSwissPairingService.updateBuchholzScores(this.tournament.players);
    
    // Mark round complete
    round.isComplete = true;
    
    console.log(`✅ Round ${roundNumber} completed!`);
    
    // Show updated standings
    console.log(`\n📈 Standings after Round ${roundNumber}:`);
    this.showStandings();
  }

  // Show current standings
  showStandings() {
    // Update Buchholz scores before displaying standings
    EnhancedSwissPairingService.updateBuchholzScores(this.tournament.players);
    
    const standings = EnhancedSwissPairingService.calculateStandings(this.tournament.players);
    
    standings.forEach((player, index) => {
      const byes = (player.pastOpponents || []).filter(o => o === 'BYE').length;
      const opponents = (player.pastOpponents || []).filter(o => o !== 'BYE').length;
      console.log(`  ${index + 1}. ${player.name}: ${player.points || 0} pts, ${player.wins || 0} wins, ${player.buchholzScore || 0} buchholz, ${byes} byes, ${opponents} opponents`);
    });
  }

  // Run full tournament
  async runFullTournament() {
    console.log('🚀 Starting Swiss Tournament Simulation (Standalone)');
    console.log('📋 Tournament: 4 rounds, 13 players');
    console.log('🎯 Focus: Bye assignment and Buchholz scoring\n');

    try {
      // Create tournament
      this.createTournament();
      
      // Run 4 rounds
      for (let round = 1; round <= 4; round++) {
        this.generateRound(round);
        this.simulateMatchResults(round);
      }
      
      // Final analysis
      console.log('\n🏆 FINAL TOURNAMENT STANDINGS:');
      this.showStandings();
      
      // Bye distribution analysis
      console.log('\n🎯 BYE DISTRIBUTION ANALYSIS:');
      const byeStats = this.tournament.players.map(player => ({
        name: player.name,
        byeCount: (player.pastOpponents || []).filter(o => o === 'BYE').length,
        points: player.points || 0
      }));
      
      byeStats.forEach(stat => {
        console.log(`  ${stat.name}: ${stat.byeCount} bye(s), ${stat.points} total points`);
      });
      
      // Fairness check
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
      
      // Check for alphabetical bias in Round 1
      console.log('\n🔍 ROUND 1 BYE ANALYSIS:');
      const round1 = this.tournament.rounds[0];
      if (round1.byePlayers && round1.byePlayers.length > 0) {
        const round1ByePlayer = round1.byePlayers[0];
        console.log(`  Round 1 bye player: ${round1ByePlayer.name}`);
        
        // Check if this was the first alphabetically
        const sortedByName = [...this.tournament.players].sort((a, b) => a.name.localeCompare(b.name));
        const isFirstAlphabetically = sortedByName[0].name === round1ByePlayer.name;
        console.log(`  Is first alphabetically: ${isFirstAlphabetically}`);
        
        if (isFirstAlphabetically) {
          console.log(`  ✅ CORRECT: First alphabetical player got Round 1 bye`);
        } else {
          console.log(`  ❌ INCORRECT: First alphabetical player should have gotten Round 1 bye`);
        }
      }
      
      console.log('\n🏁 Tournament simulation completed successfully!');
      
    } catch (error) {
      console.error('❌ Tournament simulation failed:', error);
    }
  }
}

// Run the test
const test = new SwissTournamentStandaloneTest();
test.runFullTournament().catch(console.error);