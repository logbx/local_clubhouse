import { Test, TestingModule } from '@nestjs/testing';
import { SwissTournamentStrategy } from './swiss-tournament.strategy';
import { TournamentType, TournamentCreationOptions, MatchResultOptions } from '../interfaces/tournament-strategy.interface';
import { ITournament, ITournamentPlayer, ITournamentRound, ITournamentMatch } from '../interfaces/tournament.interface';
import { EnhancedSwissPairingService } from '../utils/enhanced-swiss-pairings';

describe('SwissTournamentStrategy', () => {
  let strategy: SwissTournamentStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SwissTournamentStrategy],
    }).compile();

    strategy = module.get<SwissTournamentStrategy>(SwissTournamentStrategy);
  });

  describe('type property', () => {
    it('should return SWISS tournament type', () => {
      expect(strategy.type).toBe(TournamentType.SWISS);
    });
  });

  describe('validateCreation', () => {
    it('should validate Swiss tournament creation with valid options', () => {
      const options: TournamentCreationOptions = {
        playerCount: 8,
        rounds: 3
      };

      expect(() => strategy.validateCreation(options)).not.toThrow();
    });

    it('should throw error for too few players', () => {
      const options: TournamentCreationOptions = {
        playerCount: 3,
        rounds: 3
      };

      expect(() => strategy.validateCreation(options)).toThrow('Swiss tournaments require at least 4 players');
    });

    it('should throw error for too many rounds', () => {
      const options: TournamentCreationOptions = {
        playerCount: 8,
        rounds: 5
      };

      expect(() => strategy.validateCreation(options)).toThrow('Swiss tournaments should have fewer rounds than players');
    });

    it('should throw error for invalid round count', () => {
      const options: TournamentCreationOptions = {
        playerCount: 8,
        rounds: 0
      };

      expect(() => strategy.validateCreation(options)).toThrow('Swiss tournaments need at least 1 round');
    });
  });

  describe('generateInitialStructure', () => {
    it('should generate initial round structure for Swiss tournament', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        { id: '3', name: 'Player 3', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        { id: '4', name: 'Player 4', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] }
      ];

      const tournament: ITournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SWISS,
        players,
        rounds: [],
        currentRound: 1,
        isStarted: false,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = strategy.generateInitialStructure(players, tournament);

      expect(result).toHaveLength(1);
      expect(result[0].roundNumber).toBe(1);
      expect(result[0].matches).toHaveLength(2); // 4 players = 2 matches
      expect(result[0].matches.every(match => 
        match.player1 && match.player2 && match.status === 'pending'
      )).toBe(true);
    });

    it('should handle odd number of players with bye', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        { id: '3', name: 'Player 3', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        { id: '4', name: 'Player 4', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        { id: '5', name: 'Player 5', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] }
      ];

      const tournament: ITournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SWISS,
        players,
        rounds: [],
        currentRound: 1,
        isStarted: false,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = strategy.generateInitialStructure(players, tournament);

      expect(result).toHaveLength(1);
      expect(result[0].matches).toHaveLength(2); // 4 players paired = 2 matches
      expect(result[0].byePlayers).toHaveLength(1); // 1 bye player
    });
  });

  describe('processMatchResult', () => {
    let tournament: ITournament;
    let match: ITournamentMatch;

    beforeEach(() => {
      match = {
        matchId: 'match-1',
        player1: { id: '1', name: 'Player 1', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        player2: { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
        status: 'pending',
        winnerId: undefined,
        result: undefined
      };

      tournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SWISS,
        players: [
          { id: '1', name: 'Player 1', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
          { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] }
        ],
        rounds: [{
          roundNumber: 1,
          matches: [match],
          byePlayers: [],
          isComplete: false
        }],
        currentRound: 1,
        isStarted: true,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    it('should process win result correctly', () => {
      const options: MatchResultOptions = {
        matchId: 'match-1',
        winnerId: '1',
        isDraw: false
      };

      const result = strategy.processMatchResult(options, tournament);

      const updatedMatch = result.rounds[0].matches[0];
      expect(updatedMatch.winnerId).toBe('1');
      expect(updatedMatch.status).toBe('completed');
      expect(updatedMatch.result).toBe('win');

      const winner = result.players.find(p => p.id === '1');
      const loser = result.players.find(p => p.id === '2');
      
      expect(winner.points).toBe(1);
      expect(winner.wins).toBe(1);
      expect(loser.points).toBe(0);
      expect(loser.wins).toBe(0);
    });

    it('should process draw result correctly', () => {
      const options: MatchResultOptions = {
        matchId: 'match-1',
        winnerId: undefined,
        isDraw: true
      };

      const result = strategy.processMatchResult(options, tournament);

      const updatedMatch = result.rounds[0].matches[0];
      expect(updatedMatch.winnerId).toBeUndefined();
      expect(updatedMatch.status).toBe('completed');
      expect(updatedMatch.result).toBe('draw');

      const player1 = result.players.find(p => p.id === '1');
      const player2 = result.players.find(p => p.id === '2');
      
      expect(player1.points).toBe(0.5);
      expect(player1.wins).toBe(0);
      expect(player2.points).toBe(0.5);
      expect(player2.wins).toBe(0);
    });

    it('should throw error for invalid match ID', () => {
      const options: MatchResultOptions = {
        matchId: 'invalid-match',
        winnerId: '1',
        isDraw: false
      };

      expect(() => strategy.processMatchResult(options, tournament)).toThrow('Match not found');
    });

    it('should throw error for invalid winner ID', () => {
      const options: MatchResultOptions = {
        matchId: 'match-1',
        winnerId: '999',
        isDraw: false
      };

      expect(() => strategy.processMatchResult(options, tournament)).toThrow('Winner must be one of the match participants');
    });
  });

  describe('generateNextRound', () => {
    it('should generate next round based on current standings', () => {
      const tournament: ITournament = {
        id: 'test-tournament',
        name: 'Test Tournament',
        type: TournamentType.SWISS,
        players: [
          { id: '1', name: 'Player 1', points: 1, wins: 1, buchholzScore: 0, pastOpponents: ['2'] },
          { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: ['1'] },
          { id: '3', name: 'Player 3', points: 1, wins: 1, buchholzScore: 0, pastOpponents: ['4'] },
          { id: '4', name: 'Player 4', points: 0, wins: 0, buchholzScore: 0, pastOpponents: ['3'] }
        ],
        rounds: [{
          roundNumber: 1,
          matches: [
            {
              matchId: 'match-1',
              player1: { id: '1', name: 'Player 1', points: 1, wins: 1, buchholzScore: 0, pastOpponents: ['2'] },
              player2: { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: ['1'] },
              status: 'completed',
              winnerId: '1',
              result: 'win'
            },
            {
              matchId: 'match-2',
              player1: { id: '3', name: 'Player 3', points: 1, wins: 1, buchholzScore: 0, pastOpponents: ['4'] },
              player2: { id: '4', name: 'Player 4', points: 0, wins: 0, buchholzScore: 0, pastOpponents: ['3'] },
              status: 'completed',
              winnerId: '3',
              result: 'win'
            }
          ],
          byePlayers: [],
          isComplete: true
        }],
        currentRound: 1,
        isStarted: true,
        isFinished: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = strategy.generateNextRound(tournament);

      expect(result.roundNumber).toBe(2);
      expect(result.matches).toHaveLength(2);
      
      // Winners should be paired together, losers together
      const match1 = result.matches[0];
      const match2 = result.matches[1];
      
      expect([match1.player1.id, match1.player2.id].sort()).toEqual(['1', '3']);
      expect([match2.player1.id, match2.player2.id].sort()).toEqual(['2', '4']);
    });
  });

  describe('calculateStandings', () => {
    it('should calculate standings with proper tiebreaking', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1', points: 1.5, wins: 1, buchholzScore: 2, pastOpponents: ['2', '3'] },
        { id: '2', name: 'Player 2', points: 1.5, wins: 1, buchholzScore: 1.5, pastOpponents: ['1', '4'] },
        { id: '3', name: 'Player 3', points: 1, wins: 1, buchholzScore: 1, pastOpponents: ['4', '1'] },
        { id: '4', name: 'Player 4', points: 0, wins: 0, buchholzScore: 0.5, pastOpponents: ['3', '2'] }
      ];

      const result = strategy.calculateStandings(players);

      expect(result[0].id).toBe('1'); // Higher Buchholz score
      expect(result[1].id).toBe('2'); 
      expect(result[2].id).toBe('3');
      expect(result[3].id).toBe('4');
    });
  });

  describe('isComplete', () => {
    it('should return true when all matches are completed', () => {
      const rounds: ITournamentRound[] = [{
        roundNumber: 1,
        matches: [
          {
            matchId: 'match-1',
            player1: { id: '1', name: 'Player 1', points: 1, wins: 1, buchholzScore: 0, pastOpponents: [] },
            player2: { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
            status: 'completed',
            winnerId: '1',
            result: 'win'
          }
        ],
        byePlayers: [],
        isComplete: true
      }];

      const result = strategy.isComplete(rounds, 1);
      expect(result).toBe(true);
    });

    it('should return false when matches are pending', () => {
      const rounds: ITournamentRound[] = [{
        roundNumber: 1,
        matches: [
          {
            matchId: 'match-1',
            player1: { id: '1', name: 'Player 1', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
            player2: { id: '2', name: 'Player 2', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] },
            status: 'pending',
            winnerId: undefined,
            result: undefined
          }
        ],
        byePlayers: [],
        isComplete: false
      }];

      const result = strategy.isComplete(rounds, 1);
      expect(result).toBe(false);
    });
  });

  describe('getWinner', () => {
    it('should return the player with highest points', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1', points: 2, wins: 2, buchholzScore: 0, pastOpponents: [] },
        { id: '2', name: 'Player 2', points: 1, wins: 1, buchholzScore: 0, pastOpponents: [] },
        { id: '3', name: 'Player 3', points: 0, wins: 0, buchholzScore: 0, pastOpponents: [] }
      ];

      const result = strategy.getWinner(players);
      expect(result?.id).toBe('1');
    });

    it('should return undefined when no clear winner', () => {
      const players: ITournamentPlayer[] = [
        { id: '1', name: 'Player 1', points: 1, wins: 1, buchholzScore: 0, pastOpponents: [] },
        { id: '2', name: 'Player 2', points: 1, wins: 1, buchholzScore: 0, pastOpponents: [] }
      ];

      const result = strategy.getWinner(players);
      expect(result).toBeUndefined();
    });
  });
});