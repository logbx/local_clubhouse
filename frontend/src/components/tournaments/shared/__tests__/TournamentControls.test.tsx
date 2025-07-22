import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TournamentControls from '../TournamentControls';
import { Tournament, TournamentType } from '../../../../services/tournament.service';

const mockTournament: Tournament = {
  id: 'test-tournament-id',
  name: 'Test Tournament',
  type: TournamentType.SWISS,
  eventId: 'test-event-id',
  organizerId: 'test-organizer-id',
  players: [
    { id: '1', name: 'Player 1', userId: 'user1', isGuest: false },
    { id: '2', name: 'Player 2', userId: 'user2', isGuest: false },
    { id: '3', name: 'Player 3', userId: 'user3', isGuest: false },
    { id: '4', name: 'Player 4', userId: 'user4', isGuest: false }
  ],
  rounds: [],
  currentRound: 1,
  maxPlayers: 32,
  isStarted: false,
  isFinished: false,
  registrationOpen: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

describe('TournamentControls', () => {
  const mockOnStartTournament = jest.fn();
  const mockOnRegister = jest.fn();
  const mockOnUnregister = jest.fn();
  const mockOnOpenRegistration = jest.fn();
  const mockOnCloseRegistration = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Creator View', () => {
    it('should show tournament management controls for event creator', () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          onStartTournament={mockOnStartTournament}
          loading={false}
        />
      );

      expect(screen.getByText('Tournament Management')).toBeInTheDocument();
      expect(screen.getByText('Start Tournament')).toBeInTheDocument();
    });

    it('should show start tournament button when enough players', () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          onStartTournament={mockOnStartTournament}
          loading={false}
        />
      );

      const startButton = screen.getByRole('button', { name: /start tournament/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toBeDisabled();
    });

    it('should disable start button with insufficient players', () => {
      const tournamentWithFewPlayers = {
        ...mockTournament,
        players: [
          { id: '1', name: 'Player 1', userId: 'user1', isGuest: false },
          { id: '2', name: 'Player 2', userId: 'user2', isGuest: false }
        ]
      };

      render(
        <TournamentControls
          tournament={tournamentWithFewPlayers}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          onStartTournament={mockOnStartTournament}
          loading={false}
        />
      );

      const startButton = screen.getByRole('button', { name: /start tournament/i });
      expect(startButton).toBeDisabled();
      expect(screen.getByText(/need at least 4 players/i)).toBeInTheDocument();
    });

    it('should call onStartTournament when start button clicked', async () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          onStartTournament={mockOnStartTournament}
          loading={false}
        />
      );

      const startButton = screen.getByRole('button', { name: /start tournament/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockOnStartTournament).toHaveBeenCalledTimes(1);
      });
    });

    it('should show registration controls', () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          onOpenRegistration={mockOnOpenRegistration}
          onCloseRegistration={mockOnCloseRegistration}
          loading={false}
        />
      );

      expect(screen.getByText('Registration Control')).toBeInTheDocument();
      expect(screen.getByText(/registration is currently open/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close registration/i })).toBeInTheDocument();
    });

    it('should show tournament complete status', () => {
      const finishedTournament = {
        ...mockTournament,
        isStarted: true,
        isFinished: true
      };

      render(
        <TournamentControls
          tournament={finishedTournament}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          loading={false}
        />
      );

      expect(screen.getByText('Tournament Complete!')).toBeInTheDocument();
    });
  });

  describe('Player View', () => {
    it('should show registration button for eligible players', () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={false}
          isUserRegistered={false}
          canRegister={true}
          onRegisterForTournament={mockOnRegister}
          loading={false}
        />
      );

      expect(screen.getByText('Tournament Participation')).toBeInTheDocument();
      expect(screen.getByText('Join the Tournament')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register now/i })).toBeInTheDocument();
    });

    it('should call onRegisterForTournament when register button clicked', async () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={false}
          isUserRegistered={false}
          canRegister={true}
          onRegisterForTournament={mockOnRegister}
          loading={false}
        />
      );

      const registerButton = screen.getByRole('button', { name: /register now/i });
      fireEvent.click(registerButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalledTimes(1);
      });
    });

    it('should show registered status with unregister option', () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={false}
          isUserRegistered={true}
          canRegister={false}
          onUnregisterFromTournament={mockOnUnregister}
          loading={false}
        />
      );

      expect(screen.getByText("You're Registered!")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /unregister/i })).toBeInTheDocument();
    });

    it('should call onUnregisterFromTournament when unregister button clicked', async () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={false}
          isUserRegistered={true}
          canRegister={false}
          onUnregisterFromTournament={mockOnUnregister}
          loading={false}
        />
      );

      const unregisterButton = screen.getByRole('button', { name: /unregister/i });
      fireEvent.click(unregisterButton);

      await waitFor(() => {
        expect(mockOnUnregister).toHaveBeenCalledTimes(1);
      });
    });

    it('should show registration unavailable message', () => {
      const startedTournament = {
        ...mockTournament,
        isStarted: true
      };

      render(
        <TournamentControls
          tournament={startedTournament}
          isEventCreator={false}
          isUserRegistered={false}
          canRegister={false}
          loading={false}
        />
      );

      expect(screen.getByText('Registration Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Tournament has already started')).toBeInTheDocument();
    });

    it('should show different messages for different unavailable reasons', () => {
      const closedRegistrationTournament = {
        ...mockTournament,
        registrationOpen: false
      };

      render(
        <TournamentControls
          tournament={closedRegistrationTournament}
          isEventCreator={false}
          isUserRegistered={false}
          canRegister={false}
          loading={false}
        />
      );

      expect(screen.getByText('Registration is currently closed')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when loading', () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          loading={true}
        />
      );

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should show loading skeleton when tournament is null', () => {
      render(
        <TournamentControls
          tournament={undefined}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          loading={false}
        />
      );

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });
  });

  describe('Single Elimination Tournament', () => {
    it('should show correct minimum players for single elimination', () => {
      const seTournament = {
        ...mockTournament,
        type: TournamentType.SINGLE_ELIMINATION,
        players: [{ id: '1', name: 'Player 1', userId: 'user1', isGuest: false }]
      };

      render(
        <TournamentControls
          tournament={seTournament}
          isEventCreator={true}
          isUserRegistered={false}
          canRegister={false}
          onStartTournament={mockOnStartTournament}
          loading={false}
        />
      );

      expect(screen.getByText(/need at least 2 players/i)).toBeInTheDocument();
    });
  });

  describe('Tournament Type Display', () => {
    it('should display Swiss tournament type correctly', () => {
      render(
        <TournamentControls
          tournament={mockTournament}
          isEventCreator={false}
          isUserRegistered={false}
          canRegister={true}
          onRegisterForTournament={mockOnRegister}
          loading={false}
        />
      );

      expect(screen.getByText(/swiss tournament/i)).toBeInTheDocument();
    });

    it('should display Single Elimination tournament type correctly', () => {
      const seTournament = {
        ...mockTournament,
        type: TournamentType.SINGLE_ELIMINATION
      };

      render(
        <TournamentControls
          tournament={seTournament}
          isEventCreator={false}
          isUserRegistered={false}
          canRegister={true}
          onRegisterForTournament={mockOnRegister}
          loading={false}
        />
      );

      expect(screen.getByText(/single elimination tournament/i)).toBeInTheDocument();
    });
  });
});