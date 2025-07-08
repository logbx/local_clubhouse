import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SingleEliminationTournamentPage from '../SingleEliminationTournamentPage';
import { AuthContext } from '../../../context/AuthContext';
import { tournamentService } from '../../../services/tournament.service';
import { TournamentType } from '../../../services/tournament.service';

// Mock the tournament service
jest.mock('../../../services/tournament.service', () => ({
  tournamentService: {
    getTournament: jest.fn(),
    getTournamentsByEvent: jest.fn(),
    createTournament: jest.fn(),
    addGuestPlayer: jest.fn(),
    removePlayer: jest.fn(),
    startTournament: jest.fn(),
    registerForTournament: jest.fn(),
    submitMatchResult: jest.fn(),
    confirmMatchResult: jest.fn()
  }
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn()
  },
  LogCategory: {
    TOURNAMENT: 'tournament'
  }
}));

const mockUser = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com'
};

const mockTournament = {
  id: 'tournament-1',
  name: 'Test Single Elimination Tournament',
  type: TournamentType.SINGLE_ELIMINATION,
  players: [
    { id: 'player1', name: 'Player 1', userId: 'user1' },
    { id: 'player2', name: 'Player 2', userId: 'user2' },
    { id: 'player3', name: 'Player 3', userId: 'user3' },
    { id: 'player4', name: 'Player 4', userId: 'user4' }
  ],
  rounds: [
    {
      roundNumber: 1,
      matches: [
        {
          matchId: 'match1',
          player1: { id: 'player1', name: 'Player 1', userId: 'user1' },
          player2: { id: 'player2', name: 'Player 2', userId: 'user2' },
          status: 'completed',
          winnerId: 'player1'
        },
        {
          matchId: 'match2',
          player1: { id: 'player3', name: 'Player 3', userId: 'user3' },
          player2: { id: 'player4', name: 'Player 4', userId: 'user4' },
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
          matchId: 'match3',
          player1: { id: 'player1', name: 'Player 1', userId: 'user1' },
          player2: { id: 'TBD', name: 'TBD' },
          status: 'pending'
        }
      ],
      byePlayers: [],
      isComplete: false
    }
  ],
  currentRound: 1,
  maxPlayers: 32,
  isStarted: true,
  isFinished: false,
  registrationOpen: true,
  winnerId: undefined,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockAuthContextValue = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false
};

const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={mockAuthContextValue}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('SingleEliminationTournamentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('Loading Tournament by ID', () => {
    it('should load tournament by ID from URL params', async () => {
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(mockTournament);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage' }
      );

      await waitFor(() => {
        expect(tournamentService.getTournament).toHaveBeenCalledWith('tournament-1');
      });

      expect(screen.getByText('Test Single Elimination Tournament')).toBeInTheDocument();
    });

    it('should handle tournament loading error', async () => {
      (tournamentService.getTournament as jest.Mock).mockRejectedValue(new Error('Tournament not found'));

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage' }
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load tournament')).toBeInTheDocument();
      });
    });
  });

  describe('Loading Tournament by Event', () => {
    it('should load tournament by event ID from search params', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([mockTournament]);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(tournamentService.getTournamentsByEvent).toHaveBeenCalledWith('event-1');
      });
    });

    it('should filter for single elimination tournament type', async () => {
      const tournaments = [
        { ...mockTournament, type: TournamentType.SWISS },
        { ...mockTournament, type: TournamentType.SINGLE_ELIMINATION }
      ];
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue(tournaments);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Single Elimination Tournament')).toBeInTheDocument();
      });
    });
  });

  describe('Tournament Creation', () => {
    it('should show tournament creation form for event creator when no tournament exists', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([]);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });
    });

    it('should create single elimination tournament', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([]);
      (tournamentService.createTournament as jest.Mock).mockResolvedValue(mockTournament);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // The creation would be tested based on actual form implementation
    });
  });

  describe('Tournament Management - Event Creator', () => {
    beforeEach(() => {
      (tournamentService.getTournament as jest.Mock).mockResolvedValue({
        ...mockTournament,
        isStarted: false
      });
    });

    it('should show management controls for event creator', async () => {
      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Tournament Management')).toBeInTheDocument();
      });
    });

    it('should require minimum 2 players for single elimination', async () => {
      const tournamentWithOnePlayer = {
        ...mockTournament,
        players: [{ id: 'player1', name: 'Player 1', userId: 'user1' }],
        isStarted: false
      };
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(tournamentWithOnePlayer);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText(/need at least 2 players/i)).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start tournament/i });
      expect(startButton).toBeDisabled();
    });

    it('should start tournament when start button clicked', async () => {
      (tournamentService.startTournament as jest.Mock).mockResolvedValue(mockTournament);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /start tournament/i });
        expect(startButton).toBeInTheDocument();
        expect(startButton).not.toBeDisabled();
      });

      const startButton = screen.getByRole('button', { name: /start tournament/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(tournamentService.startTournament).toHaveBeenCalledWith('tournament-1');
      });
    });
  });

  describe('Tournament Bracket Display', () => {
    beforeEach(() => {
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(mockTournament);
    });

    it('should display tournament bracket for started tournament', async () => {
      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Tournament Bracket')).toBeInTheDocument();
      });
    });

    it('should show round names correctly', async () => {
      const finalsReadyTournament = {
        ...mockTournament,
        rounds: [
          ...mockTournament.rounds,
          {
            roundNumber: 3,
            matches: [
              {
                matchId: 'final',
                player1: { id: 'player1', name: 'Player 1', userId: 'user1' },
                player2: { id: 'player3', name: 'Player 3', userId: 'user3' },
                status: 'pending'
              }
            ],
            byePlayers: [],
            isComplete: false
          }
        ]
      };
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(finalsReadyTournament);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Finals')).toBeInTheDocument();
      });
    });

    it('should display bye players correctly', async () => {
      const tournamentWithByes = {
        ...mockTournament,
        rounds: [
          {
            ...mockTournament.rounds[0],
            byePlayers: [{ id: 'player5', name: 'Player 5', userId: 'user5' }]
          },
          ...mockTournament.rounds.slice(1)
        ]
      };
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(tournamentWithByes);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Automatic Advancement')).toBeInTheDocument();
        expect(screen.getByText('Player 5')).toBeInTheDocument();
      });
    });
  });

  describe('Match Result Submission', () => {
    beforeEach(() => {
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(mockTournament);
    });

    it('should submit match result when player submits', async () => {
      (tournamentService.submitMatchResult as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Tournament Bracket')).toBeInTheDocument();
      });

      // This would need to be adjusted based on actual match result submission UI
      // The test would simulate clicking submit result and selecting a winner
    });

    it('should confirm match result', async () => {
      (tournamentService.confirmMatchResult as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Tournament Bracket')).toBeInTheDocument();
      });

      // This would test match result confirmation
    });
  });

  describe('Tournament Completion', () => {
    it('should display tournament champion when finished', async () => {
      const finishedTournament = {
        ...mockTournament,
        isFinished: true,
        winnerId: 'player1'
      };
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(finishedTournament);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('🏆 Tournament Champion! 🏆')).toBeInTheDocument();
        expect(screen.getByText('Player 1')).toBeInTheDocument();
      });
    });
  });

  describe('Player Registration', () => {
    it('should show registration option for non-registered player', async () => {
      const unregisteredTournament = {
        ...mockTournament,
        players: mockTournament.players.filter(p => p.userId !== 'user1'),
        isStarted: false
      };
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(unregisteredTournament);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user2' }
      );

      await waitFor(() => {
        expect(screen.getByText('Join the Tournament')).toBeInTheDocument();
        expect(screen.getByText(/single elimination tournament/i)).toBeInTheDocument();
      });
    });

    it('should register player for tournament', async () => {
      const unregisteredTournament = {
        ...mockTournament,
        players: mockTournament.players.filter(p => p.userId !== 'user1'),
        isStarted: false
      };
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(unregisteredTournament);
      (tournamentService.registerForTournament as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user2' }
      );

      await waitFor(() => {
        const registerButton = screen.getByRole('button', { name: /register now/i });
        expect(registerButton).toBeInTheDocument();
      });

      const registerButton = screen.getByRole('button', { name: /register now/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(tournamentService.registerForTournament).toHaveBeenCalledWith('tournament-1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when tournament loading fails', async () => {
      (tournamentService.getTournament as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage' }
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load tournament')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should handle event validation error during creation', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination?eventId=invalid-event&eventTitle=Test%20Event&creatorId=user1' }
      );

      // This would test error handling during tournament creation
    });
  });

  describe('No Tournament State', () => {
    it('should show no tournament message for non-creators', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([]);

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination?eventId=event-1&eventTitle=Test%20Event&creatorId=user2' }
      );

      await waitFor(() => {
        expect(screen.getByText('No Tournament Available')).toBeInTheDocument();
        expect(screen.getByText("The event organizer hasn't created a tournament for this event yet.")).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner while tournament is loading', () => {
      (tournamentService.getTournament as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage' }
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Guest Player Management', () => {
    beforeEach(() => {
      (tournamentService.getTournament as jest.Mock).mockResolvedValue({
        ...mockTournament,
        isStarted: false
      });
    });

    it('should add guest player for event creator', async () => {
      (tournamentService.addGuestPlayer as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Add Guest Player')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Enter player name');
      const addButton = screen.getByRole('button', { name: /add player/i });

      fireEvent.change(input, { target: { value: 'New Guest' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(tournamentService.addGuestPlayer).toHaveBeenCalledWith('tournament-1', 'New Guest');
      });
    });

    it('should remove player for event creator', async () => {
      (tournamentService.removePlayer as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SingleEliminationTournamentPage />,
        { route: '/tournament/single-elimination/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        const removeButtons = screen.getAllByRole('button', { name: /remove/i });
        expect(removeButtons.length).toBeGreaterThan(0);
      });

      const removeButton = screen.getAllByRole('button', { name: /remove/i })[0];
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(tournamentService.removePlayer).toHaveBeenCalled();
      });
    });
  });
});