import { Test, TestingModule } from '@nestjs/testing';
import { SingleEliminationTournamentStrategy } from './single-elimination-tournament.strategy';
import { TournamentType, TournamentCreationOptions, MatchResultOptions } from '../interfaces/tournament-strategy.interface';
import { ITournament, ITournamentPlayer, ITournamentRound, ITournamentMatch } from '../interfaces/tournament.interface';

describe('SingleEliminationTournamentStrategy', () => {
  let strategy: SingleEliminationTournamentStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SingleEliminationTournamentStrategy],
    }).compile();

    strategy = module.get<SingleEliminationTournamentStrategy>(SingleEliminationTournamentStrategy);
  });

  describe('type property', () => {
    it('should return SINGLE_ELIMINATION tournament type', () => {
      expect(strategy.type).toBe(TournamentType.SINGLE_ELIMINATION);
    });
  });

  describe('validateCreation', () => {
    it('should validate single elimination tournament creation with valid options', () => {
      const options: TournamentCreationOptions = {
        playerCount: 8
      };

      expect(() => strategy.validateCreation(options)).not.toThrow();
    });

    it('should throw error for too few players', () => {
      const options: TournamentCreationOptions = {
        playerCount: 1
      };

      expect(() => strategy.validateCreation(options)).toThrow('Single elimination tournaments require at least 2 players');
    });

    it('should warn for non-power-of-2 player count', () => {
      const options: TournamentCreationOptions = {
        playerCount: 6
      };

      // Should not throw but will result in byes
      expect(() => strategy.validateCreation(options)).not.toThrow();
    });
  });

  describe('generateInitialStructure', () => {
    it('should generate bracket structure for power of 2 players', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1' },
        { id: '2', name: 'Player 2' },
        { id: '3', name: 'Player 3' },
        { id: '4', name: 'Player 4' }
      ];

      const tournament: ITournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SINGLE_ELIMINATION,
        players,
        rounds: [],
        currentRound: 1,
        isStarted: false,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = strategy.generateInitialStructure(players, tournament);

      // 4 players = 2 rounds (semi-final + final)
      expect(result).toHaveLength(2);
      
      // First round should have 2 matches
      expect(result[0].roundNumber).toBe(1);
      expect(result[0].matches).toHaveLength(2);
      
      // Second round should have 1 match with TBD players
      expect(result[1].roundNumber).toBe(2);
      expect(result[1].matches).toHaveLength(1);
      expect(result[1].matches[0].player1.id).toBe('TBD');
      expect(result[1].matches[0].player2.id).toBe('TBD');
    });

    it('should handle non-power-of-2 players with byes', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1' },
        { id: '2', name: 'Player 2' },
        { id: '3', name: 'Player 3' },
        { id: '4', name: 'Player 4' },
        { id: '5', name: 'Player 5' },
        { id: '6', name: 'Player 6' }
      ];

      const tournament: ITournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SINGLE_ELIMINATION,
        players,
        rounds: [],
        currentRound: 1,
        isStarted: false,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = strategy.generateInitialStructure(players, tournament);

      // Should create bracket for 8 players (next power of 2)
      expect(result).toHaveLength(3); // 3 rounds for 8 players
      
      // First round should have some byes
      const firstRound = result[0];
      expect(firstRound.byePlayers).toHaveLength(2); // 8 - 6 = 2 byes
      expect(firstRound.matches).toHaveLength(2); // 4 active players = 2 matches
    });

    it('should generate correct bracket structure for 8 players', () => {
      const players: ITournamentPlayer[] = Array.from({ length: 8 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Player ${i + 1}`
      }));

      const tournament: ITournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SINGLE_ELIMINATION,
        players,
        rounds: [],
        currentRound: 1,
        isStarted: false,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = strategy.generateInitialStructure(players, tournament);

      expect(result).toHaveLength(3); // Quarter-final, Semi-final, Final
      expect(result[0].matches).toHaveLength(4); // 4 quarter-final matches
      expect(result[1].matches).toHaveLength(2); // 2 semi-final matches
      expect(result[2].matches).toHaveLength(1); // 1 final match
    });
  });

  describe('processMatchResult', () => {
    let tournament: ITournament;

    beforeEach(() => {
      tournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SINGLE_ELIMINATION,
        players: [
          { id: '1', name: 'Player 1' },
          { id: '2', name: 'Player 2' },
          { id: '3', name: 'Player 3' },
          { id: '4', name: 'Player 4' }
        ],
        rounds: [
          {
            roundNumber: 1,
            matches: [
              {
                matchId: 'match-1',
                player1: { id: '1', name: 'Player 1' },
                player2: { id: '2', name: 'Player 2' },
                status: 'pending'
              },
              {
                matchId: 'match-2',
                player1: { id: '3', name: 'Player 3' },
                player2: { id: '4', name: 'Player 4' },
                status: 'pending'
              }
            ],
            byePlayers: [],
            isComplete: false
          },
          {
            roundNumber: 2,
            matches: [
              {
                matchId: 'match-3',
                player1: { id: 'TBD', name: 'TBD' },
                player2: { id: 'TBD', name: 'TBD' },
                status: 'pending'
              }
            ],
            byePlayers: [],
            isComplete: false
          }
        ],
        currentRound: 1,
        isStarted: true,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    it('should process match result and advance winner', () => {
      const options: MatchResultOptions = {
        matchId: 'match-1',
        winnerId: '1',
        isDraw: false
      };

      const result = strategy.processMatchResult(options, tournament);

      // Check that match is marked as completed
      const completedMatch = result.rounds[0].matches.find(m => m.matchId === 'match-1');
      expect(completedMatch.status).toBe('completed');
      expect(completedMatch.winnerId).toBe('1');

      // Check that winner is advanced to next round
      const nextRoundMatch = result.rounds[1].matches[0];
      expect(nextRoundMatch.player1.id).toBe('1');
    });

    it('should not allow draws in single elimination', () => {
      const options: MatchResultOptions = {
        matchId: 'match-1',
        winnerId: undefined,
        isDraw: true
      };

      expect(() => strategy.processMatchResult(options, tournament))
        .toThrow('Single elimination tournaments do not allow draws');
    });

    it('should advance tournament when final match is completed', () => {
      // Complete all first round matches
      tournament.rounds[0].matches[0].status = 'completed';
      tournament.rounds[0].matches[0].winnerId = '1';
      tournament.rounds[0].matches[1].status = 'completed';
      tournament.rounds[0].matches[1].winnerId = '3';
      tournament.rounds[0].isComplete = true;

      // Set up final match
      tournament.rounds[1].matches[0].player1 = { id: '1', name: 'Player 1' };
      tournament.rounds[1].matches[0].player2 = { id: '3', name: 'Player 3' };
      tournament.currentRound = 2;

      const options: MatchResultOptions = {
        matchId: 'match-3',
        winnerId: '1',
        isDraw: false
      };

      const result = strategy.processMatchResult(options, tournament);

      expect(result.isFinished).toBe(true);
      expect(result.winnerId).toBe('1');
    });

    it('should throw error for invalid match ID', () => {
      const options: MatchResultOptions = {
        matchId: 'invalid-match',
        winnerId: '1',
        isDraw: false
      };

      expect(() => strategy.processMatchResult(options, tournament))
        .toThrow('Match not found');
    });
  });

  describe('generateNextRound', () => {
    it('should throw error as next rounds are pre-generated', () => {
      const tournament: ITournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SINGLE_ELIMINATION,
        players: [],
        rounds: [],
        currentRound: 1,
        isStarted: true,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(() => strategy.generateNextRound(tournament))
        .toThrow('Single elimination rounds are pre-generated');
    });
  });

  describe('calculateStandings', () => {
    it('should return players sorted by advancement', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1' }, // Winner
        { id: '2', name: 'Player 2' }, // Runner-up
        { id: '3', name: 'Player 3' }, // Semi-finalist
        { id: '4', name: 'Player 4' }  // Semi-finalist
      ];

      const result = strategy.calculateStandings(players);

      // Should return in original order for single elimination
      expect(result).toEqual(players);
    });
  });

  describe('isComplete', () => {
    it('should return true when all tournament rounds are completed', () => {
      const rounds: ITournamentRound[] = [
        {
          roundNumber: 1,
          matches: [
            {
              matchId: 'match-1',
              player1: { id: '1', name: 'Player 1' },
              player2: { id: '2', name: 'Player 2' },
              status: 'completed',
              winnerId: '1'
            }
          ],
          byePlayers: [],
          isComplete: true
        },
        {
          roundNumber: 2,
          matches: [
            {
              matchId: 'match-2',
              player1: { id: '1', name: 'Player 1' },
              player2: { id: '3', name: 'Player 3' },
              status: 'completed',
              winnerId: '1'
            }
          ],
          byePlayers: [],
          isComplete: true
        }
      ];

      const result = strategy.isComplete(rounds, 2);
      expect(result).toBe(true);
    });

    it('should return false when tournament is not complete', () => {
      const rounds: ITournamentRound[] = [
        {
          roundNumber: 1,
          matches: [
            {
              matchId: 'match-1',
              player1: { id: '1', name: 'Player 1' },
              player2: { id: '2', name: 'Player 2' },
              status: 'pending'
            }
          ],
          byePlayers: [],
          isComplete: false
        }
      ];

      const result = strategy.isComplete(rounds, 1);
      expect(result).toBe(false);
    });
  });

  describe('getWinner', () => {
    it('should return undefined as winner is determined by tournament completion', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1' },
        { id: '2', name: 'Player 2' }
      ];

      const result = strategy.getWinner(players);
      expect(result).toBeUndefined();
    });
  });

  describe('helper methods', () => {
    describe('getNextPowerOfTwo', () => {
      it('should return correct next power of 2', () => {
        expect(strategy['getNextPowerOfTwo'](5)).toBe(8);
        expect(strategy['getNextPowerOfTwo'](8)).toBe(8);
        expect(strategy['getNextPowerOfTwo'](9)).toBe(16);
        expect(strategy['getNextPowerOfTwo'](1)).toBe(2);
      });
    });

    describe('calculateRounds', () => {
      it('should calculate correct number of rounds', () => {
        expect(strategy['calculateRounds'](2)).toBe(1);
        expect(strategy['calculateRounds'](4)).toBe(2);
        expect(strategy['calculateRounds'](8)).toBe(3);
        expect(strategy['calculateRounds'](16)).toBe(4);
      });
    });

    describe('advanceWinner', () => {
      it('should advance winner to correct position in next round', () => {
        const rounds: ITournamentRound[] = [
          {
            roundNumber: 1,
            matches: [
              { matchId: 'match-1', player1: { id: '1', name: 'Player 1' }, player2: { id: '2', name: 'Player 2' }, status: 'pending' },
              { matchId: 'match-2', player1: { id: '3', name: 'Player 3' }, player2: { id: '4', name: 'Player 4' }, status: 'pending' }
            ],
            byePlayers: [],
            isComplete: false
          },
          {
            roundNumber: 2,
            matches: [
              { matchId: 'match-3', player1: { id: 'TBD', name: 'TBD' }, player2: { id: 'TBD', name: 'TBD' }, status: 'pending' }
            ],
            byePlayers: [],
            isComplete: false
          }
        ];

        strategy['advanceWinner'](rounds, 'match-1', { id: '1', name: 'Player 1' });

        expect(rounds[1].matches[0].player1.id).toBe('1');
      });
    });
  });
});