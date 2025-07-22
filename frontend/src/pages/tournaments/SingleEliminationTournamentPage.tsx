import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Tournament, TournamentType } from '../../services/tournament.service';
import { tournamentService } from '../../services/tournament.service';
import { EventFeatures } from '../../types/event';
import { log, LogCategory } from '../../utils/logger';
import toast from 'react-hot-toast';
import { webSocketService } from '../../services/websocket.service';

// Import shared components
import TournamentHeader from '../../components/tournaments/shared/TournamentHeader';
import PlayerList from '../../components/tournaments/shared/PlayerList';
import TournamentControls from '../../components/tournaments/shared/TournamentControls';
import SEBracketView from '../../components/tournaments/single-elimination/SEBracketView';
import TournamentCreationForm from '../../components/TournamentCreationForm';
import { LoadingSpinner } from '../../components/LoadingSpinner';

const SingleEliminationTournamentPage: React.FC = () => {
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
  const [isStateSyncing, setIsStateSyncing] = useState(false);

  // Refs for stable WebSocket handler access
  const tournamentRef = useRef(tournament);
  const isStateSyncingRef = useRef(isStateSyncing);
  
  // Update refs when state changes
  tournamentRef.current = tournament;
  isStateSyncingRef.current = isStateSyncing;

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

  // Define load functions first (before refreshTournamentState needs them)
  const loadTournamentById = useCallback(async (id: string) => {
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
  }, []);

  const loadTournamentByEvent = useCallback(async () => {
    try {
      setLoading(true);
      const tournaments = await tournamentService.getTournamentsByEvent(eventId);
      const seTournament = tournaments.find(t => t.type === TournamentType.SINGLE_ELIMINATION);
      setTournament(seTournament || null);
      setError(null);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Request current tournament state for synchronization
  const refreshTournamentState = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') console.log('🔄 SingleEliminationTournamentPage: Refreshing tournament state for synchronization');
      setIsStateSyncing(true);
      
      if (tournament?.id) {
        await loadTournamentById(tournament.id);
      } else if (eventId) {
        await loadTournamentByEvent();
      }
      
      if (process.env.NODE_ENV === 'development') console.log('✅ SingleEliminationTournamentPage: Tournament state synchronized');
    } catch (error) {
      console.error('❌ Error refreshing tournament state:', error);
    } finally {
      setIsStateSyncing(false);
    }
  }, [tournament?.id, eventId, loadTournamentById, loadTournamentByEvent]);

  // Track processed events to prevent duplicates
  const processedEventsRef = useRef(new Set<string>());
  
  // Stable WebSocket handler using refs to prevent reconnection loops
  const handleTournamentUpdate = useCallback((data: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔔 SingleEliminationTournamentPage WebSocket update received:', {
        type: data.type,
        tournamentId: data.tournamentId,
        ourTournamentId: tournamentRef.current?.id,
        fullData: data
      });
    }
    
    // Check if this update is for our tournament
    if (data.tournamentId && data.tournamentId !== tournamentRef.current?.id) {
      if (process.env.NODE_ENV === 'development') console.log('🔕 Ignoring update for different tournament:', data.tournamentId);
      return;
    }
    
    // Skip WebSocket updates if we're currently syncing state
    if (isStateSyncingRef.current) {
      if (process.env.NODE_ENV === 'development') console.log('🔐 Skipping WebSocket update - state sync in progress:', data.type);
      return;
    }

    // Prevent duplicate event processing
    const eventKey = `${data.type}-${data.tournamentId}-${Date.now()}`;
    if (data.type === 'tournament-repaired' || data.type === 'round-started') {
      // For these events, use content-based deduplication
      const contentKey = `${data.type}-${data.tournamentId}-${JSON.stringify(data.rounds || []).substring(0, 100)}`;
      if (processedEventsRef.current.has(contentKey)) {
        if (process.env.NODE_ENV === 'development') console.log('🔒 Duplicate event ignored:', data.type);
        return;
      }
      processedEventsRef.current.add(contentKey);
      
      // Clean up old events to prevent memory leaks
      if (processedEventsRef.current.size > 50) {
        const oldestEvents = Array.from(processedEventsRef.current).slice(0, 25);
        oldestEvents.forEach(event => processedEventsRef.current.delete(event));
      }
    }
    
    if (data.type === 'registration-opened' || data.type === 'registration-closed' || 
        data.type === 'player-registered' || data.type === 'guest-player-added' || 
        data.type === 'player-removed' || data.type === 'tournament-started') {
      
      // Handle immediate state updates for better user experience
      if (data.type === 'player-registered' && data.player) {
        // Check if player already exists to prevent duplicates
        const playerExists = tournamentRef.current?.players.some(p => p.id === data.player.id);
        
        if (!playerExists && tournamentRef.current) {
          console.log('🚀 Player registered! Updating UI immediately...');
          // Update local state immediately for responsiveness
          setTournament(prev => prev ? {
            ...prev,
            players: [...prev.players, data.player]
          } : null);
        }
        
        // Still refresh from backend to ensure consistency
        setTimeout(() => refreshTournamentState(), 100);
      } else if (data.type === 'tournament-started') {
        // Handle tournament start - redirect registered users to match results
        console.log('🚀 Tournament started, checking if user should be redirected...');
        
        // Check if current user is registered for this tournament
        const isUserRegistered = tournamentRef.current?.players.some(player => 
          player.id === user?.id
        );
        
        if (isUserRegistered && tournamentRef.current?.id) {
          console.log('🔄 Redirecting registered user to match results page...');
          navigate(`/tournament/single-elimination/${tournamentRef.current.id}/results`);
          return; // Don't refresh tournament data if redirecting
        }
        
        // For non-registered users, just refresh the tournament state
        refreshTournamentState();
      } else {
        // For other events, just refresh from backend
        refreshTournamentState();
      }
    }
  }, [refreshTournamentState]);

  // WebSocket handling for real-time updates
  useEffect(() => {
    if (!tournament?.eventId || !tournament?.id) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('🔌 SingleEliminationTournamentPage: Setting up WebSocket listeners for tournament:', tournament.id, 'event:', tournament.eventId);
    }

    // Connect to WebSocket (anonymously if not authenticated)
    if (!webSocketService.isConnected()) {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && user) {
        if (process.env.NODE_ENV === 'development') console.log('🔌 SingleEliminationTournamentPage: Connecting with authentication');
        webSocketService.connect(accessToken);
      } else {
        if (process.env.NODE_ENV === 'development') console.log('🔌 SingleEliminationTournamentPage: Connecting anonymously');
        webSocketService.connectAnonymously();
      }
    }

    // Join the event room to receive tournament updates
    webSocketService.joinEventChat(tournament.eventId);
    if (process.env.NODE_ENV === 'development') console.log('🔌 SingleEliminationTournamentPage: Joined event room:', tournament.eventId);
    
    // Also join tournament-specific room for more targeted updates
    webSocketService.joinTournament(tournament.id);
    if (process.env.NODE_ENV === 'development') console.log('🔌 SingleEliminationTournamentPage: Joined tournament room:', tournament.id);

    // Refresh state to ensure we have the latest data
    refreshTournamentState();

    // Subscribe to WebSocket tournament updates using stable handler
    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('🔌 SingleEliminationTournamentPage: Cleaning up WebSocket listeners');
      webSocketService.removeTournamentListeners();
      if (tournament?.id) {
        webSocketService.leaveTournament(tournament.id);
      }
    };
  }, [tournament?.eventId, tournament?.id, user?.id, refreshTournamentState]);

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
    navigate(`/tournament/single-elimination/${tournament.id}/manage?eventId=${eventId}&eventTitle=${encodeURIComponent(eventTitle)}&creatorId=${eventCreatorId}`);
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

  const handleSubmitMatchResult = async (matchId: string, winnerId: string) => {
    if (!tournament) return;
    
    // Find the match to determine the loser
    const match = tournament.rounds
      .flatMap(round => round.matches)
      .find(m => m.matchId === matchId);
    
    if (!match) {
      toast.error('Match not found');
      return;
    }
    
    // Calculate loserId: the player who is not the winner
    const loserId = match.player1.id === winnerId ? match.player2.id : match.player1.id;
    
    try {
      setActionLoading(true);
      await tournamentService.submitMatchResult(tournament.id, matchId, winnerId, loserId);
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

  const handleDisputeMatchResult = async (matchId: string, reason: string) => {
    if (!tournament) return;
    
    try {
      setActionLoading(true);
      await tournamentService.disputeMatchResult(tournament.id, matchId, reason);
      if (tournamentId) {
        await loadTournamentById(tournamentId);
      } else {
        await loadTournamentByEvent();
      }
      toast.success('Match result disputed. Tournament organizer will review.');
    } catch (error) {
      console.error('Failed to dispute match result:', error);
      toast.error('Failed to dispute match result');
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
              eventFeature={EventFeatures.SINGLE_ELIMINATION_TOURNAMENT}
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

        {/* Tournament is active - show bracket */}
        {tournament.isStarted && (
          <SEBracketView
            tournament={tournament}
            currentUserId={user?.id}
            isEventCreator={isEventCreator || false}
            onSubmitResult={handleSubmitMatchResult}
            onConfirmResult={handleConfirmMatchResult}
            onDisputeResult={handleDisputeMatchResult}
          />
        )}
      </div>
    </div>
  );
};

export default SingleEliminationTournamentPage;