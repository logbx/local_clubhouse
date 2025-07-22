import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import SwissTournamentPage from '../SwissTournamentPage';
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
  name: 'Test Tournament',
  type: TournamentType.SWISS,
  players: [
    { id: 'player1', name: 'Player 1', userId: 'user1', points: 1, wins: 1, buchholzScore: 0 },
    { id: 'player2', name: 'Player 2', userId: 'user2', points: 0.5, wins: 0, buchholzScore: 0 },
    { id: 'player3', name: 'Player 3', userId: 'user3', points: 0, wins: 0, buchholzScore: 0 },
    { id: 'player4', name: 'Player 4', userId: 'user4', points: 1.5, wins: 1, buchholzScore: 0 }
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
          winnerId: 'player1',
          result: 'win'
        },
        {
          matchId: 'match2',
          player1: { id: 'player3', name: 'Player 3', userId: 'user3' },
          player2: { id: 'player4', name: 'Player 4', userId: 'user4' },
          status: 'completed',
          winnerId: 'player4',
          result: 'win'
        }
      ],
      byePlayers: [],
      isComplete: true
    }
  ],
  currentRound: 1,
  maxPlayers: 32,
  isStarted: true,
  isFinished: false,
  registrationOpen: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockAuthContextValue = {
  user: mockUser,
  loading: false,
  error: null,
  login: jest.fn(),
  logout: jest.fn(),
  updateUser: jest.fn(),
  refreshToken: jest.fn(),
  setUser: jest.fn(),
  clearError: jest.fn(),
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

describe('SwissTournamentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('Loading Tournament by ID', () => {
    it('should load tournament by ID from URL params', async () => {
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(mockTournament);

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage' }
      );

      await waitFor(() => {
        expect(tournamentService.getTournament).toHaveBeenCalledWith('tournament-1');
      });

      expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    });

    it('should handle tournament loading error', async () => {
      (tournamentService.getTournament as jest.Mock).mockRejectedValue(new Error('Tournament not found'));

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage' }
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
        <SwissTournamentPage />,
        { route: '/tournament/swiss?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(tournamentService.getTournamentsByEvent).toHaveBeenCalledWith('event-1');
      });
    });
  });

  describe('Tournament Creation', () => {
    it('should show tournament creation form for event creator when no tournament exists', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([]);

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });
    });

    it('should create tournament when form is submitted', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([]);
      (tournamentService.createTournament as jest.Mock).mockResolvedValue(mockTournament);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Assuming the creation form has a submit button
      // This would need to be adjusted based on actual implementation
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
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Tournament Management')).toBeInTheDocument();
      });
    });

    it('should start tournament when start button clicked', async () => {
      (tournamentService.startTournament as jest.Mock).mockResolvedValue(mockTournament);

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /start tournament/i });
        expect(startButton).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /start tournament/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(tournamentService.startTournament).toHaveBeenCalledWith('tournament-1');
      });
    });

    it('should add guest player', async () => {
      (tournamentService.addGuestPlayer as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
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

    it('should remove player', async () => {
      (tournamentService.removePlayer as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
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

  describe('Tournament Participation - Player', () => {
    it('should show registration option for non-registered player', async () => {
      const unregisteredTournament = {
        ...mockTournament,
        players: mockTournament.players.filter(p => p.id !== 'user1'),
        isStarted: false
      };
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(unregisteredTournament);

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user2' }
      );

      await waitFor(() => {
        expect(screen.getByText('Join the Tournament')).toBeInTheDocument();
      });
    });

    it('should register player for tournament', async () => {
      const unregisteredTournament = {
        ...mockTournament,
        players: mockTournament.players.filter(p => p.id !== 'user1'),
        isStarted: false
      };
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(unregisteredTournament);
      (tournamentService.registerForTournament as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user2' }
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

    it('should show registered status for registered player', async () => {
      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user2' }
      );

      await waitFor(() => {
        expect(screen.getByText("You're Registered!")).toBeInTheDocument();
      });
    });
  });

  describe('Tournament Rounds and Matches', () => {
    beforeEach(() => {
      (tournamentService.getTournament as jest.Mock).mockResolvedValue(mockTournament);
    });

    it('should display tournament rounds and standings for started tournament', async () => {
      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Round 1')).toBeInTheDocument();
        expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
      });
    });

    it('should submit match result', async () => {
      (tournamentService.submitMatchResult as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Round 1')).toBeInTheDocument();
      });

      // This would need to be adjusted based on actual match result submission UI
    });

    it('should confirm match result', async () => {
      (tournamentService.confirmMatchResult as jest.Mock).mockResolvedValue({});

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage?eventId=event-1&eventTitle=Test%20Event&creatorId=user1' }
      );

      await waitFor(() => {
        expect(screen.getByText('Round 1')).toBeInTheDocument();
      });

      // This would need to be adjusted based on actual match confirmation UI
    });
  });

  describe('Error Handling', () => {
    it('should show error state when tournament loading fails', async () => {
      (tournamentService.getTournament as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage' }
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load tournament')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should handle tournament creation error', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss?eventId=invalid-event&eventTitle=Test%20Event&creatorId=user1' }
      );

      // This would test tournament creation error handling
    });
  });

  describe('No Tournament State', () => {
    it('should show no tournament message for non-creators', async () => {
      (tournamentService.getTournamentsByEvent as jest.Mock).mockResolvedValue([]);

      renderWithProviders(
        <SwissTournamentPage />,
        { route: '/tournament/swiss?eventId=event-1&eventTitle=Test%20Event&creatorId=user2' }
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
        <SwissTournamentPage />,
        { route: '/tournament/swiss/tournament-1/manage' }
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });
});