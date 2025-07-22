import React from 'react';
import { render, screen } from '@testing-library/react';
import TournamentHeader from '../TournamentHeader';
import { Tournament, TournamentType } from '../../../../services/tournament.service';

const mockTournament: Tournament = {
  id: 'test-tournament-id',
  name: 'Test Tournament',
  type: TournamentType.SWISS,
  eventId: 'test-event-id',
  organizerId: 'test-organizer-id',
  players: [
    { id: '1', name: 'Player 1', userId: 'user1', isGuest: false },
    { id: '2', name: 'Player 2', userId: 'user2', isGuest: false }
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

describe('TournamentHeader', () => {
  it('should render event title when no tournament provided', () => {
    render(
      <TournamentHeader 
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Tournament')).toBeInTheDocument();
  });

  it('should render tournament information when tournament provided', () => {
    render(
      <TournamentHeader 
        tournament={mockTournament}
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    expect(screen.getByText('Swiss Tournament')).toBeInTheDocument();
    expect(screen.getByText('2 / 32 players')).toBeInTheDocument();
  });

  it('should display tournament status correctly', () => {
    const startedTournament = {
      ...mockTournament,
      isStarted: true
    };

    render(
      <TournamentHeader 
        tournament={startedTournament}
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('should display finished tournament status', () => {
    const finishedTournament = {
      ...mockTournament,
      isStarted: true,
      isFinished: true
    };

    render(
      <TournamentHeader 
        tournament={finishedTournament}
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('should display single elimination tournament type correctly', () => {
    const seTournament = {
      ...mockTournament,
      type: TournamentType.SINGLE_ELIMINATION
    };

    render(
      <TournamentHeader 
        tournament={seTournament}
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('Single Elimination')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <TournamentHeader 
        eventTitle="Test Event" 
        loading={true} 
      />
    );

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should display registration status', () => {
    const closedRegistrationTournament = {
      ...mockTournament,
      registrationOpen: false
    };

    render(
      <TournamentHeader 
        tournament={closedRegistrationTournament}
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('Registration Closed')).toBeInTheDocument();
  });

  it('should show when tournament is full', () => {
    const fullTournament = {
      ...mockTournament,
      players: Array.from({ length: 32 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Player ${i + 1}`,
        userId: `user${i + 1}`
      }))
    };

    render(
      <TournamentHeader 
        tournament={fullTournament}
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('32 / 32 players')).toBeInTheDocument();
    expect(screen.getByText('Tournament Full')).toBeInTheDocument();
  });

  it('should handle missing tournament gracefully', () => {
    render(
      <TournamentHeader 
        tournament={undefined}
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Tournament')).toBeInTheDocument();
  });

  it('should display current round for started tournament', () => {
    const activeRoundTournament = {
      ...mockTournament,
      isStarted: true,
      currentRound: 3
    };

    render(
      <TournamentHeader 
        tournament={activeRoundTournament}
        eventTitle="Test Event" 
        loading={false} 
      />
    );

    expect(screen.getByText('Round 3')).toBeInTheDocument();
  });
});