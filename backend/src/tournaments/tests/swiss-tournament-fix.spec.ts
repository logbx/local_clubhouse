import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedSwissPairingService } from '../utils/enhanced-swiss-pairings';

describe('Swiss Tournament Pairing Logic', () => {
  describe('generateSwissPairings', () => {
    it('should include ALL players in subsequent rounds, not just winners', () => {
      // Setup: 4 players after Round 1
      const players = [
        { id: 'A', name: 'Alice', isGuest: false, points: 1, wins: 1, pastOpponents: ['B'] }, // Winner
        { id: 'B', name: 'Bob', isGuest: false, points: 0, wins: 0, pastOpponents: ['A'] },   // Loser
        { id: 'C', name: 'Charlie', isGuest: false, points: 1, wins: 1, pastOpponents: ['D'] }, // Winner  
        { id: 'D', name: 'David', isGuest: false, points: 0, wins: 0, pastOpponents: ['C'] }    // Loser
      ];

      // Generate Round 2 pairings
      const round2 = EnhancedSwissPairingService.generateSwissPairings(players, 2);

      // Verify ALL 4 players are included in Round 2
      const playersInRound2 = new Set();
      round2.matches.forEach(match => {
        playersInRound2.add(match.player1.id);
        playersInRound2.add(match.player2.id);
      });

      // Check that all 4 players are paired for Round 2
      expect(playersInRound2.size).toBe(4);
      expect(playersInRound2.has('A')).toBe(true); // Winner from Round 1
      expect(playersInRound2.has('B')).toBe(true); // Loser from Round 1
      expect(playersInRound2.has('C')).toBe(true); // Winner from Round 1
      expect(playersInRound2.has('D')).toBe(true); // Loser from Round 1

      // Verify we have 2 matches (4 players / 2)
      expect(round2.matches.length).toBe(2);

      // Verify the correct Swiss pairing (winners vs winners, losers vs losers when possible)
      // With points: A(1), C(1), B(0), D(0)
      // Should try to pair: A vs C (both 1 point), B vs D (both 0 points)
      const match1 = round2.matches[0];
      const match2 = round2.matches[1];
      
      // Check that winners are paired against each other when possible
      const winnersInSameMatch = (match1.player1.points === 1 && match1.player2.points === 1) ||
                                (match2.player1.points === 1 && match2.player2.points === 1);
      expect(winnersInSameMatch).toBe(true);
    });

    it('should handle 10 players correctly in Round 2', () => {
      // Setup: 10 players after Round 1 (similar to user's scenario)
      const players = [];
      for (let i = 0; i < 10; i++) {
        players.push({
          id: `player${i}`,
          name: `Player ${i}`,
          isGuest: false,
          points: i % 2, // Alternating winners and losers
          wins: i % 2,
          pastOpponents: [`opponent${i}`]
        });
      }

      // Generate Round 2 pairings
      const round2 = EnhancedSwissPairingService.generateSwissPairings(players, 2);

      // Verify ALL 10 players are included
      const playersInRound2 = new Set();
      round2.matches.forEach(match => {
        playersInRound2.add(match.player1.id);
        playersInRound2.add(match.player2.id);
      });

      expect(playersInRound2.size).toBe(10);
      expect(round2.matches.length).toBe(5); // 10 players = 5 matches

      // Verify no player is left out
      for (let i = 0; i < 10; i++) {
        expect(playersInRound2.has(`player${i}`)).toBe(true);
      }
    });
  });
});