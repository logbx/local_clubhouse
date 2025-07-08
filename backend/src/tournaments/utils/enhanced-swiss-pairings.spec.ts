import { EnhancedSwissPairingService } from './enhanced-swiss-pairings';
import { ITournamentPlayer, ITournamentRound } from '../interfaces/tournament.interface';

describe('EnhancedSwissPairingService', () => {
  let players: ITournamentPlayer[];

  beforeEach(() => {
    players = [
      { id: '1', name: 'Player 1', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
      { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
      { id: '3', name: 'Player 3', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
      { id: '4', name: 'Player 4', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
      { id: '5', name: 'Player 5', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
      { id: '6', name: 'Player 6', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] }
    ];
  });

  describe('generateSwissPairings', () => {
    it('should generate pairings for first round with even players', () => {
      const result = EnhancedSwissPairingService.generateSwissPairings(players, 1);

      expect(result.roundNumber).toBe(1);
      expect(result.matches).toHaveLength(3);
      expect(result.byePlayers).toHaveLength(0);
      
      // All players should be paired
      const pairedPlayerIds = new Set();
      result.matches.forEach(match => {
        pairedPlayerIds.add(match.player1.id);
        pairedPlayerIds.add(match.player2.id);
      });
      expect(pairedPlayerIds.size).toBe(6);
    });

    it('should handle odd number of players with bye', () => {
      const oddPlayers = players.slice(0, 5); // 5 players
      const result = EnhancedSwissPairingService.generateSwissPairings(oddPlayers, 1);

      expect(result.roundNumber).toBe(1);
      expect(result.matches).toHaveLength(2);
      expect(result.byePlayers).toHaveLength(1);
      
      // 4 players paired + 1 bye
      const pairedPlayerIds = new Set();
      result.matches.forEach(match => {
        pairedPlayerIds.add(match.player1.id);
        pairedPlayerIds.add(match.player2.id);
      });
      expect(pairedPlayerIds.size + result.byePlayers.length).toBe(5);
    });

    it('should avoid pairing players who already played each other', () => {
      // Set up scenario where players have already played
      players[0].pastOpponents = ['2'];
      players[1].pastOpponents = ['1'];
      players[0].points = 1;
      players[1].points = 0;

      const result = EnhancedSwissPairingService.generateSwissPairings(players, 2);

      // Player 1 and Player 2 should not be paired again
      const match = result.matches.find(m => 
        (m.player1.id === '1' && m.player2.id === '2') ||
        (m.player1.id === '2' && m.player2.id === '1')
      );
      expect(match).toBeUndefined();
    });

    it('should pair players with similar point totals', () => {
      // Set up players with different point totals
      players[0].points = 2; // Winner group
      players[1].points = 2; // Winner group
      players[2].points = 1; // Middle group
      players[3].points = 1; // Middle group
      players[4].points = 0; // Loser group
      players[5].points = 0; // Loser group

      const result = EnhancedSwissPairingService.generateSwissPairings(players, 2);

      // Check that players are paired within their point groups
      result.matches.forEach(match => {
        const p1Points = match.player1.points || 0;
        const p2Points = match.player2.points || 0;
        // Allow some flexibility (within 1 point)
        expect(Math.abs(p1Points - p2Points)).toBeLessThanOrEqual(1);
      });
    });

    it('should handle bye assignment intelligently', () => {
      const oddPlayers = players.slice(0, 5);
      
      // Give some players previous byes
      oddPlayers[0].hadBye = true;
      oddPlayers[1].hadBye = true;

      const result = EnhancedSwissPairingService.generateSwissPairings(oddPlayers, 2);

      // Player who gets bye should preferably be someone who hasn't had one
      expect(result.byePlayers[0].hadBye).toBeFalsy();
    });

    it('should assign points correctly for bye players', () => {
      const oddPlayers = players.slice(0, 5);
      const result = EnhancedSwissPairingService.generateSwissPairings(oddPlayers, 1);

      expect(result.byePlayers).toHaveLength(1);
      const byePlayer = result.byePlayers[0];
      expect(byePlayer.points).toBe(1); // Bye should give 1 point
      expect(byePlayer.hadBye).toBe(true);
    });

    it('should use pairing options when provided', () => {
      const options = {
        allowRematch: false,
        preferSimilarRatings: true,
        avoidColorImbalance: true
      };

      const result = EnhancedSwissPairingService.generateSwissPairings(players, 1, options);

      expect(result.roundNumber).toBe(1);
      expect(result.matches).toHaveLength(3);
      // The algorithm should respect the options
    });

    it('should handle force rematch when necessary', () => {
      // Create scenario where rematch is unavoidable
      const fourPlayers = players.slice(0, 4);
      
      // Everyone has played everyone in a round-robin style
      fourPlayers[0].pastOpponents = ['2', '3', '4'];
      fourPlayers[1].pastOpponents = ['1', '3', '4'];
      fourPlayers[2].pastOpponents = ['1', '2', '4'];
      fourPlayers[3].pastOpponents = ['1', '2', '3'];

      const options = { allowRematch: true };
      const result = EnhancedSwissPairingService.generateSwissPairings(fourPlayers, 4, options);

      expect(result.matches).toHaveLength(2);
      // Should still create pairings even though all are rematches
    });
  });

  describe('sortPlayersBySwissRanking', () => {
    it('should sort players by points, then Buchholz, then wins', () => {
      const unsortedPlayers: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1', points: 1, wins: 1, buchholzScore: 0.5, pastOpponents: [] },
        { id: '2', name: 'Player 2', points: 1.5, wins: 1, buchholzScore: 1, pastOpponents: [] },
        { id: '3', name: 'Player 3', points: 1, wins: 0, buchholzScore: 1, pastOpponents: [] },
        { id: '4', name: 'Player 4', points: 1, wins: 1, buchholzScore: 1, pastOpponents: [] }
      ];

      const result = EnhancedSwissPairingService.sortPlayersBySwissRanking(unsortedPlayers);

      // Should be sorted: Player 2 (1.5 pts), Player 4 (1 pt, 1 win, 1 bhz), Player 3 (1 pt, 0 wins, 1 bhz), Player 1 (1 pt, 1 win, 0.5 bhz)
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('4');
      expect(result[2].id).toBe('3');
      expect(result[3].id).toBe('1');
    });

    it('should handle equal players correctly', () => {
      const equalPlayers: ITournamentPlayer[] = [
        { id: '1', name: 'Alice', points: 1, wins: 1, buchholzScore: 1, pastOpponents: [] },
        { id: '2', name: 'Bob', points: 1, wins: 1, buchholzScore: 1, pastOpponents: [] }
      ];

      const result = EnhancedSwissPairingService.sortPlayersBySwissRanking(equalPlayers);

      // Should sort by name as final tiebreaker
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
    });
  });

  describe('calculateBuchholzScore', () => {
    it('should calculate Buchholz score correctly', () => {
      const testPlayer: ITournamentPlayer = {
        id: '1',
        name: 'Test Player',
        points: 1.5,
        wins: 1,
        buchholzScore: 0,
        pastOpponents: ['2', '3']
      };

      const allPlayers: ITournamentPlayer[] = [
        testPlayer,
        { id: '2', name: 'Opponent 1', points: 1, wins: 1, buchholzScore: 0, pastOpponents: [] },
        { id: '3', name: 'Opponent 2', points: 0.5, wins: 0, buchholzScore: 0, pastOpponents: [] },
        { id: '4', name: 'Other Player', points: 2, wins: 2, buchholzScore: 0, pastOpponents: [] }
      ];

      const result = EnhancedSwissPairingService.calculateBuchholzScore(testPlayer, allPlayers);

      // Should be sum of opponents' scores: 1 + 0.5 = 1.5
      expect(result).toBe(1.5);
    });

    it('should handle player with no opponents', () => {
      const testPlayer: ITournamentPlayer = {
        id: '1',
        name: 'Test Player',
        points: 0,
        wins: 0,
        buchholzScore: 0,
        pastOpponents: []
      };

      const result = EnhancedSwissPairingService.calculateBuchholzScore(testPlayer, [testPlayer]);

      expect(result).toBe(0);
    });
  });

  describe('assignColorsIfNeeded', () => {
    it('should assign colors to players when color tracking is enabled', () => {
      const match = {
        matchId: 'test-match',
        player1: { id: '1', name: 'Player 1', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        player2: { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        status: 'pending' as const
      };

      EnhancedSwissPairingService['assignColorsIfNeeded'](match, true);

      expect(match.player1.color).toBeDefined();
      expect(match.player2.color).toBeDefined();
      expect(match.player1.color).not.toBe(match.player2.color);
    });

    it('should not assign colors when color tracking is disabled', () => {
      const match = {
        matchId: 'test-match',
        player1: { id: '1', name: 'Player 1', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        player2: { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        status: 'pending' as const
      };

      EnhancedSwissPairingService['assignColorsIfNeeded'](match, false);

      expect(match.player1.color).toBeUndefined();
      expect(match.player2.color).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty player list', () => {
      const result = EnhancedSwissPairingService.generateSwissPairings([], 1);

      expect(result.roundNumber).toBe(1);
      expect(result.matches).toHaveLength(0);
      expect(result.byePlayers).toHaveLength(0);
      expect(result.isComplete).toBe(true);
    });

    it('should handle single player', () => {
      const singlePlayer = [players[0]];
      const result = EnhancedSwissPairingService.generateSwissPairings(singlePlayer, 1);

      expect(result.roundNumber).toBe(1);
      expect(result.matches).toHaveLength(0);
      expect(result.byePlayers).toHaveLength(1);
      expect(result.byePlayers[0].id).toBe('1');
    });

    it('should handle large number of players efficiently', () => {
      const largePlayers: ITournamentPlayer[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Player ${i + 1}`,
        points: Math.floor(Math.random() * 5),
        wins: Math.floor(Math.random() * 3),
        buchholzScore: Math.random() * 10,
        pastOpponents: []
      }));

      const startTime = Date.now();
      const result = EnhancedSwissPairingService.generateSwissPairings(largePlayers, 1);
      const endTime = Date.now();

      expect(result.matches).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain consistency across multiple rounds', () => {
      let currentPlayers = [...players];
      const rounds: ITournamentRound[] = [];

      // Simulate 3 rounds
      for (let round = 1; round <= 3; round++) {
        const roundResult = EnhancedSwissPairingService.generateSwissPairings(currentPlayers, round);
        rounds.push(roundResult);

        // Simulate random results
        roundResult.matches.forEach(match => {
          const winnerId = Math.random() < 0.5 ? match.player1.id : match.player2.id;
          const winner = currentPlayers.find(p => p.id === winnerId);
          const loser = currentPlayers.find(p => p.id !== winnerId && 
            (p.id === match.player1.id || p.id === match.player2.id));

          if (winner && loser) {
            winner.points = (winner.points || 0) + 1;
            winner.wins = (winner.wins || 0) + 1;
            winner.pastOpponents = [...(winner.pastOpponents || []), loser.id];
            loser.pastOpponents = [...(loser.pastOpponents || []), winner.id];
          }
        });

        // Handle bye players
        roundResult.byePlayers.forEach(byePlayer => {
          const player = currentPlayers.find(p => p.id === byePlayer.id);
          if (player) {
            player.points = (player.points || 0) + 1;
            player.hadBye = true;
          }
        });
      }

      // Verify no player had more than one bye
      const playersWithMultipleByes = currentPlayers.filter(p => 
        rounds.filter(r => r.byePlayers.some(bp => bp.id === p.id)).length > 1
      );
      expect(playersWithMultipleByes).toHaveLength(0);
    });
  });
});