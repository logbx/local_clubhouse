import { tournamentService, TournamentType } from '../services/tournament.service';

export interface TestPlayer {
  name: string;
  isGuest: boolean;
}

export const generateTestPlayers = (count: number): TestPlayer[] => {
  const names = [
    'Alex Johnson', 'Sam Wilson', 'Jordan Lee', 'Taylor Brown', 'Casey Martinez',
    'Morgan Davis', 'Riley Garcia', 'Cameron Rodriguez', 'Avery Thompson', 'Parker White',
    'Quinn Anderson', 'Blake Miller', 'Sage Taylor', 'River Jackson', 'Skyler Harris',
    'Emery Clark', 'Phoenix Lewis', 'Dakota Hall', 'Sydney Allen', 'Rowan Young',
    'Hayden King', 'Finley Wright', 'Jamie Green', 'Drew Adams', 'Kendall Baker',
    'Peyton Gonzalez', 'Reese Nelson', 'Charlie Carter', 'Eden Mitchell', 'Gray Turner',
    'Lane Phillips', 'Sage Campbell', 'Storm Parker'
  ];

  return names.slice(0, count).map((name, index) => ({
    name,
    isGuest: true // All test players are guests for easier management
  }));
};

export const createTestTournament = async (
  eventId: string, 
  playerCount: number = 8,
  tournamentName?: string
): Promise<string> => {
  try {
    // Create tournament
    const tournament = await tournamentService.createTournament(
      eventId,
      tournamentName || `Test Tournament - ${playerCount} Players`,
      Math.max(playerCount, 32), // Set max to at least the player count
      TournamentType.SINGLE_ELIMINATION
    );

    // Add test players
    const testPlayers = generateTestPlayers(playerCount);
    for (const player of testPlayers) {
      await tournamentService.addGuestPlayer(tournament.id, player.name);
    }

    console.log(`✅ Created test tournament with ${playerCount} players`);
    return tournament.id;
  } catch (error) {
    console.error('❌ Failed to create test tournament:', error);
    throw error;
  }
};

export const simulateRandomResults = async (tournamentId: string): Promise<void> => {
  try {
    const tournament = await tournamentService.getTournament(tournamentId);
    
    if (!tournament.isStarted) {
      console.log('🚀 Starting tournament...');
      await tournamentService.startTournament(tournamentId);
    }

    // Get updated tournament data
    const updatedTournament = await tournamentService.getTournament(tournamentId);
    
    // Simulate results for pending matches
    for (const round of updatedTournament.rounds) {
      console.log(`🎯 Simulating Round ${round.roundNumber}`);
      
      for (const match of round.matches) {
        if (match.status === 'pending' && !match.winnerId) {
          // Randomly select winner
          const players = [match.player1, match.player2];
          const winner = players[Math.floor(Math.random() * players.length)];
          const loser = players.find(p => p.id !== winner.id)!;
          
          console.log(`  ⚔️  Match: ${match.player1.name} vs ${match.player2.name}`);
          console.log(`  🏆 Winner: ${winner.name}`);
          
          // Report and confirm result as organizer
          await tournamentService.overrideMatchResult(
            tournamentId,
            match.matchId,
            winner.id,
            loser.id,
            'completed',
            'win'
          );
          
          // Small delay to make it more realistic
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    const finalTournament = await tournamentService.getTournament(tournamentId);
    if (finalTournament.isFinished && finalTournament.winnerId) {
      const winner = finalTournament.players.find(p => p.id === finalTournament.winnerId);
      console.log(`🎉 Tournament completed! Winner: ${winner?.name}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to simulate tournament results:', error);
    throw error;
  }
};

export const runFullTournamentSimulation = async (
  eventId: string,
  playerCount: number = 8,
  tournamentName?: string
): Promise<string> => {
  try {
    console.log(`🎮 Starting full tournament simulation with ${playerCount} players...`);
    
    // Create tournament with test players
    const tournamentId = await createTestTournament(eventId, playerCount, tournamentName);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate all results
    await simulateRandomResults(tournamentId);
    
    console.log(`✨ Tournament simulation completed! Tournament ID: ${tournamentId}`);
    return tournamentId;
    
  } catch (error) {
    console.error('❌ Tournament simulation failed:', error);
    throw error;
  }
};

// Developer console helpers - these can be called from browser dev tools
declare global {
  interface Window {
    tournamentTesting: {
      createTestTournament: typeof createTestTournament;
      simulateRandomResults: typeof simulateRandomResults;
      runFullTournamentSimulation: typeof runFullTournamentSimulation;
      generateTestPlayers: typeof generateTestPlayers;
    };
  }
}

// Expose testing functions to global scope in development
if (process.env.NODE_ENV === 'development') {
  window.tournamentTesting = {
    createTestTournament,
    simulateRandomResults,
    runFullTournamentSimulation,
    generateTestPlayers
  };
} 