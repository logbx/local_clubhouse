import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TournamentType, Tournament, TournamentPlayer } from '../services/tournament.service';
import { tournamentService } from '../services/tournament.service';
import TournamentHeader from '../components/tournaments/shared/TournamentHeader';
import TournamentControls from '../components/tournaments/shared/TournamentControls';
import TournamentSetup from '../components/TournamentSetup';
import SEBracketView from '../components/tournaments/single-elimination/SEBracketView';
import { log, LogCategory } from '../utils/logger';
import { webSocketService } from '../services/websocket.service';
import { toast } from 'react-hot-toast';

const SingleEliminationTournament: React.FC = () => {
  const { tournamentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const eventId = searchParams.get('eventId') || '';
  const eventTitle = searchParams.get('eventTitle') || '';
  const eventCreatorId = searchParams.get('creatorId') || '';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is the event creator
  const isEventCreator = user && eventCreatorId && user.id === eventCreatorId;

  // Check if current user is registered for the tournament
  const isUserRegistered = tournament && user && tournament.players.some(p => p.userId === user.id);

  // Load tournament data based on URL parameters
  useEffect(() => {
    const loadTournament = async () => {
      setLoading(true);
      setError(null);
      try {
        let tournamentData;
        
        if (tournamentId) {
          // If we have a tournamentId, load that specific tournament
          tournamentData = await tournamentService.getTournamentById(tournamentId);
          if (!tournamentData) {
            throw new Error('Tournament not found');
          }
        } else if (eventId) {
          // If we have an eventId, load existing tournament for that event
          const tournaments = await tournamentService.getTournamentsByEvent(eventId);
          tournamentData = tournaments?.[0];
          
          // Note: Tournament creation is now handled by TournamentCreationForm
          // No auto-creation here to avoid API validation errors
        }

        if (tournamentData) {
          const frontendTournament: Tournament = {
            id: tournamentData._id || tournamentData.id,
            name: tournamentData.name || eventTitle,
            eventId: tournamentData.eventId || eventId,
            createdBy: tournamentData.organizerId || eventCreatorId,
            players: tournamentData.players?.map(p => ({
              id: p.id,
              name: p.name,
              fullName: p.fullName,
              username: p.username,
              userId: p.userId,
              isGuest: p.isGuest,
              registeredAt: p.registeredAt
            })) || [],
            registeredUsers: tournamentData.players
              ?.filter(p => !p.isGuest && p.userId)
              .map(p => ({
                userId: p.userId!,
                username: p.name,
                registeredAt: new Date(tournamentData.createdAt).getTime()
              })) || [],
            matches: tournamentData.matches || [],
            rounds: tournamentData.rounds?.length || 0,
            status: (() => {
              if (tournamentData.isStarted) return 'active';
              if (tournamentData.isFinished) return 'completed';
              if (tournamentData.registrationOpen === false) return 'registration_closed';
              return 'registration_open';
            })(),
            winner: tournamentData.winner || null,
            createdAt: new Date(tournamentData.createdAt).getTime(),
            maxPlayers: tournamentData.maxPlayers,
            isStarted: tournamentData.isStarted,
            isFinished: tournamentData.isFinished,
            registrationOpen: tournamentData.registrationOpen,
            type: TournamentType.SINGLE_ELIMINATION
          };
          setTournament(frontendTournament);
        }
      } catch (err: any) {
        log.error(LogCategory.TOURNAMENT, 'Failed to load tournament', err);
        setError(err.message || 'Failed to load tournament');
      } finally {
        setLoading(false);
      }
    };

    loadTournament();
  }, [tournamentId, eventId, eventTitle, eventCreatorId, isEventCreator]);

  // WebSocket handling for real-time updates
  useEffect(() => {
    if (!tournament?.eventId) return undefined;

    console.log('🔌 Setting up WebSocket listeners for SET Tournament Page - Tournament:', tournamentId, 'Event:', tournament.eventId);
    
    // Join event chat to receive tournament updates
    webSocketService.joinEventChat(tournament.eventId);

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 SET Tournament Page WebSocket update received:', {
        type: data.type,
        tournamentId: data.tournamentId,
        ourTournamentId: tournamentId,
        fullData: data
      });
      
      // Check if this update is for our tournament
      if (data.tournamentId && data.tournamentId !== tournamentId) {
        console.log('🔕 Ignoring update for different tournament:', data.tournamentId);
        return;
      }
      
      // Handle all tournament-related events
      if (data.type === 'player-registered' || 
          data.type === 'player-removed' ||
          data.type === 'match-result-submitted' || 
          data.type === 'round-started' || 
          data.type === 'tournament-completed' ||
          data.type === 'tournament-started' ||
          data.type === 'tournament-repaired') {
        
        // Show appropriate notifications
        if (data.type === 'player-registered' && data.player) {
          toast.success(`👤 ${data.player.name} joined the tournament!`);
        }
        
        if (data.type === 'match-result-submitted' && data.result) {
          toast.success(`🏆 Match result updated!`);
        }
        
        if (data.type === 'round-started') {
          toast.success(`🚀 Next round has started!`);
        }
        
        if (data.type === 'tournament-completed') {
          toast.success(`🏆 Tournament completed!`);
        }
        
        if (data.type === 'tournament-started') {
          toast.success(`🎯 Tournament has started!`);
        }
        
        // Refresh tournament data by re-running the loadTournament effect
        console.log('🔄 Triggering tournament reload due to:', data.type);
        
        // Re-trigger the loadTournament effect by updating a dependency
        // We can do this by calling the loadTournament function directly
        const loadTournament = async () => {
          setLoading(true);
          setError(null);
          try {
            let tournamentData;
            
            if (tournamentId) {
              tournamentData = await tournamentService.getTournamentById(tournamentId);
              if (!tournamentData) {
                throw new Error('Tournament not found');
              }
            } else if (eventId) {
              const tournaments = await tournamentService.getTournamentsByEvent(eventId);
              tournamentData = tournaments?.[0];
            }

            if (tournamentData) {
              const frontendTournament: Tournament = {
                id: tournamentData._id || tournamentData.id,
                name: tournamentData.name || eventTitle,
                eventId: tournamentData.eventId || eventId,
                createdBy: tournamentData.organizerId || eventCreatorId,
                players: tournamentData.players?.map(p => ({
                  id: p.id,
                  name: p.name,
                  fullName: p.fullName,
                  username: p.username,
                  userId: p.userId,
                  isGuest: p.isGuest,
                  registeredAt: p.registeredAt
                })) || [],
                registeredUsers: tournamentData.players
                  ?.filter(p => !p.isGuest && p.userId)
                  .map(p => ({
                    userId: p.userId!,
                    username: p.name,
                    registeredAt: new Date(tournamentData.createdAt).getTime()
                  })) || [],
                matches: tournamentData.matches || [],
                rounds: tournamentData.rounds?.length || 0,
                status: (() => {
                  if (tournamentData.isStarted) return 'active';
                  if (tournamentData.isFinished) return 'completed';
                  if (tournamentData.registrationOpen === false) return 'registration_closed';
                  return 'registration_open';
                })(),
                winner: tournamentData.winner || null,
                createdAt: new Date(tournamentData.createdAt).getTime(),
                maxPlayers: tournamentData.maxPlayers,
                isStarted: tournamentData.isStarted,
                isFinished: tournamentData.isFinished,
                registrationOpen: tournamentData.registrationOpen,
                type: TournamentType.SINGLE_ELIMINATION
              };
              setTournament(frontendTournament);
            }
          } catch (err: any) {
            log.error(LogCategory.TOURNAMENT, 'Failed to reload tournament', err);
          } finally {
            setLoading(false);
          }
        };
        
        loadTournament();
      }
    };

    // Set up tournament update listener
    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    // Cleanup function
    return () => {
      webSocketService.removeTournamentListeners();
    };
  }, [tournament?.eventId, tournamentId, eventId, eventTitle, eventCreatorId]);

  const registerForTournament = async () => {
    if (!tournament || !user) return;

    try {
      log.info(LogCategory.TOURNAMENT, 'Registering for tournament', {
        tournamentId: tournament.id,
        userId: user.id
      });

      const updatedTournament = await tournamentService.registerForTournament(tournament.id);
      
      if (updatedTournament) {
        setTournament({
          ...tournament,
          players: updatedTournament.players.map(p => ({
            id: p.id,
            name: p.name,
            fullName: p.fullName,
            username: p.username,
            userId: p.userId,
            isGuest: p.isGuest,
            registeredAt: p.registeredAt
          })),
          registeredUsers: updatedTournament.players
            .filter(p => !p.isGuest && p.userId)
            .map(p => ({
              userId: p.userId!,
              username: p.name,
              registeredAt: new Date(updatedTournament.createdAt).getTime()
            }))
        });
      }
    } catch (err: any) {
      log.error(LogCategory.TOURNAMENT, 'Failed to register for tournament', err);
      alert(err.message || 'Failed to register for tournament');
    }
  };

  const unregisterFromTournament = async () => {
    if (!tournament || !user) return;

    try {
      log.info(LogCategory.TOURNAMENT, 'Unregistering from tournament', {
        tournamentId: tournament.id,
        userId: user.id
      });

      const updatedTournament = await tournamentService.unregisterFromTournament(tournament.id);
      
      if (updatedTournament) {
        setTournament({
          ...tournament,
          players: updatedTournament.players.map(p => ({
            id: p.id,
            name: p.name,
            fullName: p.fullName,
            username: p.username,
            userId: p.userId,
            isGuest: p.isGuest,
            registeredAt: p.registeredAt
          })),
          registeredUsers: updatedTournament.players
            .filter(p => !p.isGuest && p.userId)
            .map(p => ({
              userId: p.userId!,
              username: p.name,
              registeredAt: new Date(updatedTournament.createdAt).getTime()
            }))
        });
      }
    } catch (err: any) {
      log.error(LogCategory.TOURNAMENT, 'Failed to unregister from tournament', err);
      alert(err.message || 'Failed to unregister from tournament');
    }
  };

  const startTournament = async () => {
    if (!tournament || !user) return;

    try {
      log.info(LogCategory.TOURNAMENT, 'Starting tournament', {
        tournamentId: tournament.id,
        userId: user.id
      });

      await tournamentService.startTournament(tournament.id);
      
      // Redirect organizer to results page after starting tournament
      if (isEventCreator) {
        log.info(LogCategory.TOURNAMENT, 'Redirecting to results page', {
          tournamentId: tournament.id,
          redirectUrl: `/tournament/single-elimination/${tournament.id}/results`
        });
        navigate(`/tournament/single-elimination/${tournament.id}/results`);
      } else {
        // For non-organizers, reload the tournament data to show the started state
        window.location.reload();
      }
    } catch (err: any) {
      log.error(LogCategory.TOURNAMENT, 'Failed to start tournament', err);
      alert(err.message || 'Failed to start tournament');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Loading tournament...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">{error}</h2>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament && !eventId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tournament not found</h2>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {tournament ? (
          <>
            <TournamentHeader
              tournament={tournament}
              eventTitle={eventTitle}
              loading={loading}
            />

            <TournamentControls
              tournament={tournament}
              isEventCreator={isEventCreator}
              isUserRegistered={isUserRegistered}
              canRegister={!tournament.isStarted && !tournament.isFinished && tournament.registrationOpen}
              onStartTournament={startTournament}
              onRegisterForTournament={registerForTournament}
              onUnregisterFromTournament={unregisterFromTournament}
              loading={loading}
            />

            {tournament.isStarted ? (
              <SEBracketView
                tournament={tournament}
                currentUserId={user?.id}
                isEventCreator={isEventCreator}
                onSubmitResult={async () => {}}
                onConfirmResult={async () => {}}
                onDisputeResult={async () => {}}
              />
            ) : (
              <TournamentSetup tournament={tournament} />
            )}
          </>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Creating tournament...</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleEliminationTournament;   