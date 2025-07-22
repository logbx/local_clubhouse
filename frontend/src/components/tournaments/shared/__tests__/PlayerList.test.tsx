import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlayerList from '../PlayerList';
import { Tournament, TournamentType } from '../../../../services/tournament.service';

const mockTournament: Tournament = {
  id: 'test-tournament-id',
  name: 'Test Tournament',
  type: TournamentType.SWISS,
  eventId: 'test-event-id',
  organizerId: 'test-organizer-id',
  players: [
    { id: '1', name: 'John Doe', userId: 'user1', isGuest: false },
    { id: '2', name: 'Jane Smith', userId: 'user2', isGuest: false },
    { id: '3', name: 'Guest Player', userId: undefined, isGuest: true }
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

describe('PlayerList', () => {
  const mockOnAddGuestPlayer = jest.fn();
  const mockOnRemovePlayer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render player list with all players', () => {
    render(
      <PlayerList
        tournament={mockTournament}
        isEventCreator={true}
        currentUserId="user1"
        onAddGuestPlayer={mockOnAddGuestPlayer}
        onRemovePlayer={mockOnRemovePlayer}
        loading={false}
      />
    );

    expect(screen.getByText('Tournament Players')).toBeInTheDocument();
    expect(screen.getByText('3 / 32 players registered')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Guest Player')).toBeInTheDocument();
  });

  it('should show guest indicator for guest players', () => {
    render(
      <PlayerList
        tournament={mockTournament}
        isEventCreator={true}
        currentUserId="user1"
        onAddGuestPlayer={mockOnAddGuestPlayer}
        onRemovePlayer={mockOnRemovePlayer}
        loading={false}
      />
    );

    const guestBadges = screen.getAllByText('Guest');
    expect(guestBadges).toHaveLength(1);
  });

  it('should show "You" indicator for current user', () => {
    render(
      <PlayerList
        tournament={mockTournament}
        isEventCreator={true}
        currentUserId="user1"
        onAddGuestPlayer={mockOnAddGuestPlayer}
        onRemovePlayer={mockOnRemovePlayer}
        loading={false}
      />
    );

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  describe('Event Creator Controls', () => {
    it('should show add guest player form for event creator', () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      expect(screen.getByText('Add Guest Player')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter player name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add player/i })).toBeInTheDocument();
    });

    it('should call onAddGuestPlayer when form is submitted', async () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      const input = screen.getByPlaceholderText('Enter player name');
      const addButton = screen.getByRole('button', { name: /add player/i });

      fireEvent.change(input, { target: { value: 'New Guest Player' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAddGuestPlayer).toHaveBeenCalledWith('New Guest Player');
      });
    });

    it('should not submit empty guest player name', async () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      const addButton = screen.getByRole('button', { name: /add player/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAddGuestPlayer).not.toHaveBeenCalled();
      });
    });

    it('should clear input after successful submission', async () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      const input = screen.getByPlaceholderText('Enter player name') as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: /add player/i });

      fireEvent.change(input, { target: { value: 'New Guest Player' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should show remove buttons for players when event creator', () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(3); // One for each player
    });

    it('should call onRemovePlayer when remove button clicked', async () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(mockOnRemovePlayer).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('Non-Event Creator View', () => {
    it('should not show add guest player form for non-event creator', () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={false}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      expect(screen.queryByText('Add Guest Player')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Enter player name')).not.toBeInTheDocument();
    });

    it('should not show remove buttons for non-event creator', () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={false}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      const removeButtons = screen.queryAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(0);
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when loading', () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={true}
        />
      );

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should disable add button when loading', () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={true}
        />
      );

      const addButton = screen.getByRole('button', { name: /add player/i });
      expect(addButton).toBeDisabled();
    });

    it('should disable remove buttons when loading', () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={true}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      removeButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no players', () => {
      const emptyTournament = {
        ...mockTournament,
        players: []
      };

      render(
        <PlayerList
          tournament={emptyTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      expect(screen.getByText('No players registered yet')).toBeInTheDocument();
      expect(screen.getByText('0 / 32 players registered')).toBeInTheDocument();
    });
  });

  describe('Player Count Display', () => {
    it('should show correct player count', () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      expect(screen.getByText('3 / 32 players registered')).toBeInTheDocument();
    });

    it('should highlight when tournament is full', () => {
      const fullTournament = {
        ...mockTournament,
        players: Array.from({ length: 32 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Player ${i + 1}`,
          userId: `user${i + 1}`,
          isGuest: false
        }))
      };

      render(
        <PlayerList
          tournament={fullTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      expect(screen.getByText('32 / 32 players registered')).toBeInTheDocument();
      expect(screen.getByText('Tournament Full')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should trim whitespace from guest player name', async () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      const input = screen.getByPlaceholderText('Enter player name');
      const addButton = screen.getByRole('button', { name: /add player/i });

      fireEvent.change(input, { target: { value: '  Guest Player  ' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnAddGuestPlayer).toHaveBeenCalledWith('Guest Player');
      });
    });

    it('should handle Enter key press in input field', async () => {
      render(
        <PlayerList
          tournament={mockTournament}
          isEventCreator={true}
          currentUserId="user1"
          onAddGuestPlayer={mockOnAddGuestPlayer}
          onRemovePlayer={mockOnRemovePlayer}
          loading={false}
        />
      );

      const input = screen.getByPlaceholderText('Enter player name');

      fireEvent.change(input, { target: { value: 'Enter Key Player' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnAddGuestPlayer).toHaveBeenCalledWith('Enter Key Player');
      });
    });
  });
});