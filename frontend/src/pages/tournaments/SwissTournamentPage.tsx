import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Tournament, TournamentType } from '../../services/tournament.service';
import { tournamentService } from '../../services/tournament.service';
import { EventFeatures } from '../../types/event';
import { log, LogCategory } from '../../utils/logger';
import toast from 'react-hot-toast';

// Import new shared components
import TournamentHeader from '../../components/tournaments/shared/TournamentHeader';
import PlayerList from '../../components/tournaments/shared/PlayerList';
import TournamentControls from '../../components/tournaments/shared/TournamentControls';
import SwissStandings from '../../components/tournaments/swiss/SwissStandings';
import SwissRoundView from '../../components/tournaments/swiss/SwissRoundView';
import TournamentCreationForm from '../../components/TournamentCreationForm';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const SwissTournamentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const eventId = searchParams.get('eventId') || '';
  const eventTitle = searchParams.get('eventTitle') || '';
  const eventCreatorId = searchParams.get('creatorId') || '';
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // User role checks
  const isEventCreator = user && eventCreatorId && user.id === eventCreatorId;
  const isUserRegistered = tournament && user && tournament.players.some(p => p.id === user.id);
  const canRegister = user && !isUserRegistered && !tournament?.isStarted && !tournament?.isFinished && tournament?.registrationOpen !== false;

  useEffect(() => {
    if (tournamentId) {
      loadTournamentById(tournamentId);
    } else if (eventId) {
      loadTournamentByEvent();
    } else {
      setLoading(false);
    }
  }, [tournamentId, eventId]);

  const loadTournamentById = async (id: string) => {
    try {
      setLoading(true);
      const tournament = await tournamentService.getTournament(id);
      setTournament(tournament);
      setError(null);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentByEvent = async () => {
    try {
      setLoading(true);
      const tournaments = await tournamentService.getTournamentsByEvent(eventId);
      const swissTournament = tournaments.find(t => t.type === TournamentType.SWISS);
      setTournament(swissTournament || null);
      setError(null);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = (tournament: any) => {
    // This function is called after the TournamentCreationForm successfully creates a tournament
    // We just need to navigate to the tournament management page
    log.info(LogCategory.TOURNAMENT, 'Tournament created successfully, navigating to management page', {
      tournamentId: tournament.id,
      eventId,
      eventTitle
    });
    
    setTournament(tournament);
    toast.success('Tournament created successfully!');
    
    // Navigate to the tournament management page
    navigate(`/tournament/swiss/${tournament.id}/manage?eventId=${eventId}&eventTitle=${encodeURIComponent(eventTitle)}&creatorId=${eventCreatorId}`);
  };

  const handleAddGuestPlayer = async (name: string) => {
    if (!tournament) return;
    
    try {
      setActionLoading(true);
      await tournamentService.addGuestPlayer(tournament.id, name);
      if (tournamentId) {
        await loadTournamentById(tournamentId);
      } else {
        await loadTournamentByEvent();
      }
      toast.success(`Added ${name} as guest player`);
    } catch (error) {
      console.error('Failed to add guest player:', error);
      toast.error('Failed to add guest player');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!tournament) return;
    
    try {
      setActionLoading(true);
      await tournamentService.removePlayer(tournament.id, playerId);
      if (tournamentId) {
        await loadTournamentById(tournamentId);
      } else {
        await loadTournamentByEvent();
      }
      toast.success('Player removed successfully');
    } catch (error) {
      console.error('Failed to remove player:', error);
      toast.error('Failed to remove player');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTournament = async () => {
    if (!tournament) return;
    
    try {
      setActionLoading(true);
      await tournamentService.startTournament(tournament.id);
      if (tournamentId) {
        await loadTournamentById(tournamentId);
      } else {
        await loadTournamentByEvent();
      }
      toast.success('Tournament started!');
    } catch (error) {
      console.error('Failed to start tournament:', error);
      toast.error('Failed to start tournament');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterForTournament = async () => {
    if (!tournament) return;
    
    try {
      setActionLoading(true);
      await tournamentService.registerForTournament(tournament.id);
      if (tournamentId) {
        await loadTournamentById(tournamentId);
      } else {
        await loadTournamentByEvent();
      }
      toast.success('Successfully registered for tournament!');
    } catch (error) {
      console.error('Failed to register for tournament:', error);
      toast.error('Failed to register for tournament');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregisterFromTournament = async () => {
    if (!tournament || !user) return;
    
    try {
      setActionLoading(true);
      await tournamentService.unregisterPlayer(tournament.id);
      if (tournamentId) {
        await loadTournamentById(tournamentId);
      } else {
        await loadTournamentByEvent();
      }
      toast.success('Successfully unregistered from tournament');
    } catch (error) {
      console.error('Failed to unregister from tournament:', error);
      toast.error('Failed to unregister from tournament');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitMatchResult = async (matchId: string, result: 'win' | 'loss' | 'draw', winnerId?: string) => {
    if (!tournament) return;
    
    try {
      setActionLoading(true);
      if (result === 'draw') {
        await tournamentService.submitMatchResult(tournament.id, matchId, null, true);
      } else {
        await tournamentService.submitMatchResult(tournament.id, matchId, winnerId!, false);
      }
      if (tournamentId) {
        await loadTournamentById(tournamentId);
      } else {
        await loadTournamentByEvent();
      }
      toast.success('Match result submitted!');
    } catch (error) {
      console.error('Failed to submit match result:', error);
      toast.error('Failed to submit match result');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmMatchResult = async (matchId: string) => {
    if (!tournament) return;
    
    try {
      setActionLoading(true);
      await tournamentService.confirmMatchResult(tournament.id, matchId);
      if (tournamentId) {
        await loadTournamentById(tournamentId);
      } else {
        await loadTournamentByEvent();
      }
      toast.success('Match result confirmed!');
    } catch (error) {
      console.error('Failed to confirm match result:', error);
      toast.error('Failed to confirm match result');
    } finally {
      setActionLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show tournament creation page for event creators if no tournament exists
  if (!tournament && isEventCreator) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <TournamentHeader eventTitle={eventTitle} loading={false} />
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <TournamentCreationForm
              eventId={eventId}
              eventFeature={EventFeatures.SWISS_TOURNAMENT}
              onTournamentCreated={handleCreateTournament}
              defaultName={`${eventTitle} Tournament`}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show "no tournament" message for non-creators
  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <TournamentHeader eventTitle={eventTitle} loading={false} />
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              No Tournament Available
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The event organizer hasn't created a tournament for this event yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main tournament view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <TournamentHeader 
          tournament={tournament} 
          eventTitle={eventTitle} 
          loading={false} 
        />

        <TournamentControls
          tournament={tournament}
          isEventCreator={isEventCreator || false}
          isUserRegistered={isUserRegistered || false}
          canRegister={canRegister || false}
          onStartTournament={handleStartTournament}
          onRegisterForTournament={handleRegisterForTournament}
          onUnregisterFromTournament={handleUnregisterFromTournament}
          loading={actionLoading}
        />

        {/* Tournament hasn't started - show player list */}
        {!tournament.isStarted && (
          <PlayerList
            tournament={tournament}
            isEventCreator={isEventCreator || false}
            currentUserId={user?.id}
            onAddGuestPlayer={handleAddGuestPlayer}
            onRemovePlayer={handleRemovePlayer}
            loading={actionLoading}
          />
        )}

        {/* Tournament is active - show rounds and standings */}
        {tournament.isStarted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rounds View */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {tournament.rounds.map((round) => (
                  <SwissRoundView
                    key={round.roundNumber}
                    tournament={tournament}
                    round={round}
                    currentUserId={user?.id}
                    isEventCreator={isEventCreator || false}
                    onSubmitResult={handleSubmitMatchResult}
                    onConfirmResult={handleConfirmMatchResult}
                  />
                ))}
              </div>
            </div>

            {/* Standings Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <SwissStandings
                  tournament={tournament}
                  loading={actionLoading}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwissTournamentPage;