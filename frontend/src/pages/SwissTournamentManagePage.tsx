import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tournamentService, Tournament, TournamentMatch } from '../services/tournament.service';
import { webSocketService } from '../services/websocket.service';
import { TrophyIcon, UserPlusIcon, PlayIcon, FireIcon, CogIcon } from '@heroicons/react/24/outline';
import { EnhancedSwissTournamentPairings } from '../components/EnhancedSwissTournamentPairings';
import SwissTournamentStandings from '../components/SwissTournamentStandings';
import { TournamentHeader } from '../components/shared/TournamentHeader';
import { PlayerManagement } from '../components/shared/PlayerManagement';
import { TournamentSetupTab } from '../components/shared/TournamentSetupTab';
import { DeleteConfirmModal } from '../components/shared/DeleteConfirmModal';
import { toast } from 'react-hot-toast';

const SwissTournamentManagePage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const eventTitle = searchParams.get('eventTitle') || '';
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'players' | 'live'>('setup');
  const [addingGuest, setAddingGuest] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const tournamentData = await tournamentService.getTournament(tournamentId!);
      setTournament(tournamentData);
      
      // Auto-select appropriate tab based on tournament state
      if (tournamentData.isStarted) {
        setActiveTab('live');
      } else if (tournamentData.players.length > 0) {
        setActiveTab('players');
      } else {
        setActiveTab('setup');
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId]);

  // Periodic refresh to ensure state consistency
  useEffect(() => {
    if (!tournamentId || !tournament?.isStarted) return;
    
    const interval = setInterval(async () => {
      try {
        console.log('🔄 Periodic tournament state refresh');
        const updatedTournament = await tournamentService.getTournament(tournamentId);
        setTournament(updatedTournament);
      } catch (error) {
        console.error('❌ Error in periodic refresh:', error);
      }
    }, 10000); // Refresh every 10 seconds for active tournaments
    
    return () => clearInterval(interval);
  }, [tournamentId, tournament?.isStarted]);

  // WebSocket handling for real-time updates
  useEffect(() => {
    if (!tournament?.eventId || !tournamentId) return;

    webSocketService.joinEventChat(tournament.eventId);
    webSocketService.joinTournament(tournamentId);

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 Tournament Management WebSocket update received:', data);
      
      if (data.type === 'registration-opened' || data.type === 'registration-closed' || 
          data.type === 'player-registered' || data.type === 'guest-player-added' ||
          data.type === 'player-removed' || data.type === 'tournament-started' ||
          data.type === 'match-result-submitted' || data.type === 'round-started' ||
          data.type === 'tournament-completed') {
        
        // Handle immediate state updates for player events to prevent display lag
        if (data.type === 'player-registered' && data.player) {
          console.log('🚀 Player registered! Updating UI immediately...');
          setTournament(prevTournament => {
            if (!prevTournament) return null;
            const playerExists = prevTournament.players.some(p => p.id === data.player.id);
            if (playerExists) {
              console.log('⚠️ Player already exists in current state, skipping duplicate registration:', data.player.name);
              return prevTournament;
            }
            return {
              ...prevTournament,
              players: [...prevTournament.players, data.player]
            };
          });
        } else if (data.type === 'guest-player-added' && data.player) {
          console.log('🚀 Guest player added! Updating UI immediately...');
          setTournament(prevTournament => {
            if (!prevTournament) return null;
            const playerExists = prevTournament.players.some(p => p.id === data.player.id);
            if (playerExists) {
              console.log('⚠️ Guest player already exists in current state, skipping duplicate add:', data.player.name);
              return prevTournament;
            }
            return {
              ...prevTournament,
              players: [...prevTournament.players, data.player]
            };
          });
        } else if (data.type === 'player-removed' && data.playerId) {
          console.log('🚀 Player removed! Updating UI immediately...');
          setTournament(prevTournament => {
            if (!prevTournament) return null;
            return {
              ...prevTournament,
              players: prevTournament.players.filter(p => p.id !== data.playerId)
            };
          });
        } else {
          // For other events, refresh tournament data from backend
          const refreshTournament = async () => {
            try {
              if (tournamentId) {
                console.log('🔄 WebSocket triggered tournament refresh');
                const updatedTournament = await tournamentService.getTournament(tournamentId);
                setTournament(updatedTournament);
                console.log('✅ Tournament state refreshed from WebSocket update');
              }
            } catch (error) {
              console.error('❌ Error refreshing tournament data:', error);
            }
          };
          refreshTournament();
        }
        
        // Show notifications for automatic events
        if (data.type === 'round-started' && data.message) {
          toast.success(`🚀 ${data.message}! Round ${data.currentRound} is now active.`);
        }
        
        if (data.type === 'tournament-completed' && data.message) {
          toast.success(`🏆 ${data.message}! The tournament has ended.`);
        }
      }
    };

    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    return () => {
      webSocketService.removeTournamentListeners();
      if (tournamentId) {
        webSocketService.leaveTournament(tournamentId);
      }
    };
  }, [tournament?.eventId, tournamentId]);

  const handleStartTournament = async () => {
    if (!tournamentId) return;

    try {
      await tournamentService.startTournament(tournamentId);
      const updatedTournament = await tournamentService.getTournament(tournamentId);
      setTournament(updatedTournament);
      setActiveTab('live');
    } catch (err) {
      console.error('Failed to start tournament:', err);
      alert('Failed to start tournament. Please try again.');
    }
  };

  // Rounds now start automatically when current round is completed

  const handleAddGuest = async (name: string) => {
    if (!tournamentId || !name.trim()) return;

    setAddingGuest(true);
    try {
      // Only call the API - WebSocket will handle the state update
      await tournamentService.addGuestPlayer(tournamentId, name.trim());
      // Don't manually update tournament state here - let WebSocket handle it
      // This prevents double updates and unnecessary re-renders
    } catch (err) {
      console.error('Failed to add guest player:', err);
      alert('Failed to add guest player. Please try again.');
    } finally {
      setAddingGuest(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!tournamentId || tournament?.isStarted) return;

    try {
      // Only call the API - WebSocket will handle the state update
      await tournamentService.removePlayer(tournamentId, playerId);
      // Don't manually update tournament state here - let WebSocket handle it
      // This prevents double updates and unnecessary re-renders
    } catch (err) {
      console.error('Failed to remove player:', err);
      alert('Failed to remove player. Please try again.');
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournamentId || !tournament) return;

    setDeleting(true);
    try {
      await tournamentService.deleteTournament(tournamentId);
      alert('Tournament deleted successfully');
      navigate(-1);
    } catch (err) {
      console.error('Failed to delete tournament:', err);
      alert('Failed to delete tournament. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenRegistration = async () => {
    if (!tournamentId) return;

    try {
      const updatedTournament = await tournamentService.openRegistration(tournamentId);
      setTournament(updatedTournament);
    } catch (err) {
      console.error('Failed to open registration:', err);
      alert('Failed to open registration. Please try again.');
    }
  };

  const handleCloseRegistration = async () => {
    if (!tournamentId) return;

    try {
      const updatedTournament = await tournamentService.closeRegistration(tournamentId);
      setTournament(updatedTournament);
    } catch (err) {
      console.error('Failed to close registration:', err);
      alert('Failed to close registration. Please try again.');
    }
  };

  const handleForceRoundCompletion = async () => {
    if (!tournament) return;

    const tournamentId = tournament._id || tournament.id;
    try {
      const updatedTournament = await tournamentService.forceRoundCompletion(tournamentId);
      setTournament(updatedTournament);
      toast.success('Round completion check completed!');
    } catch (error) {
      console.error('Error forcing round completion:', error);
      toast.error('Failed to force round completion check');
    }
  };

  const handleReportResult = async (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => {
    if (!tournament || !user) return;

    const isOrganizer = String(tournament.organizerId) === user.id;
    
    // Check if match is already completed to prevent double submission for non-organizers
    if (match.status === 'completed' && !isOrganizer) {
      toast.error('This match has already been completed');
      return;
    }
    const isPlayer1 = match.player1.id === user.id;
    const isPlayer2 = match.player2.id === user.id;
    const isParticipant = isPlayer1 || isPlayer2;

    const tournamentId = tournament._id || tournament.id;
    
    // Get fresh tournament state before submitting
    console.log('🔄 Refreshing tournament state before submission...');
    try {
      const freshTournament = await tournamentService.getTournament(tournamentId);
      setTournament(freshTournament);
      
      // Find the fresh match state
      const freshMatch = freshTournament.rounds
        .flatMap(round => round.matches)
        .find(m => m.matchId === match.matchId);
      
      if (!freshMatch) {
        toast.error('Match not found in tournament');
        return;
      }
      
      console.log('🏓 Submitting result for match:', {
        matchId: match.matchId,
        originalStatus: match.status,
        freshStatus: freshMatch.status,
        result,
        isOrganizer,
        tournamentId: tournamentId
      });
      
      // Use fresh match state for decision making
      if (freshMatch.status === 'completed' && !isOrganizer) {
        toast.error('This match has already been completed');
        return;
      }
      
      // For submitted/confirmed matches, only allow organizer or appropriate player actions
      if ((freshMatch.status === 'submitted' || freshMatch.status === 'confirmed') && !isOrganizer) {
        toast.error('This match result is awaiting confirmation. Only organizers can override.');
        return;
      }
      
      // Update match reference to fresh state
      match = freshMatch;
      
    } catch (error) {
      console.error('Error refreshing tournament state:', error);
      toast.error('Failed to refresh tournament state');
      return;
    }

    try {
      let winnerId: string | null = null;
      let loserId: string | null = null;
      let isDraw = false;

      if (result === 'draw') {
        isDraw = true;
      } else {
        // Handle win/loss
        if (isOrganizer) {
          // Organizer is setting explicit winner/loser
          winnerId = result === 'win' ? match.player1.id : match.player2.id;
          loserId = result === 'win' ? match.player2.id : match.player1.id;
        } else if (isParticipant) {
          // Player is reporting their own result
          winnerId = result === 'win' ? user.id : (isPlayer1 ? match.player2.id : match.player1.id);
          loserId = result === 'win' ? (isPlayer1 ? match.player2.id : match.player1.id) : user.id;
        } else {
          toast.error('You are not authorized to report this match result');
          return;
        }
      }

      // Use appropriate endpoint based on match status and user role
      let updatedTournament;
      
      if (match.status === 'completed' && isOrganizer) {
        // Organizer overriding completed match - use override endpoint
        updatedTournament = await tournamentService.overrideResult(
          tournamentId,
          match.matchId,
          winnerId,
          loserId,
          result,
          'Organizer override'
        );
      } else {
        // Normal submission for pending matches
        if (isDraw) {
          updatedTournament = await tournamentService.submitMatchResult(
            tournamentId, 
            match.matchId, 
            null, 
            null,
            true // isDraw = true
          );
        } else {
          updatedTournament = await tournamentService.submitMatchResult(
            tournamentId, 
            match.matchId, 
            winnerId!, 
            loserId!,
            false // isDraw = false
          );
        }
      }
      
      // Immediately update the tournament state to prevent race conditions
      setTournament(updatedTournament);
      
      // Also force a refresh after a short delay to ensure consistency
      setTimeout(async () => {
        try {
          const refreshedTournament = await tournamentService.getTournament(tournamentId);
          setTournament(refreshedTournament);
        } catch (refreshError) {
          console.error('Error refreshing tournament after result submission:', refreshError);
        }
      }, 500);

      toast.success(
        match.status === 'completed' && isOrganizer
          ? 'Match result overridden successfully!'
          : 'Match result submitted successfully!'
      );
    } catch (error) {
      console.error('Error submitting match result:', error);
      
      // Refresh tournament state even on error to ensure UI is consistent
      try {
        const refreshedTournament = await tournamentService.getTournament(tournamentId);
        setTournament(refreshedTournament);
      } catch (refreshError) {
        console.error('Error refreshing tournament after failed submission:', refreshError);
      }
      
      toast.error('Failed to submit match result');
    }
  };

  // Check if user is the organizer
  if (tournament && String(tournament.organizerId) !== user?.id) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have permission to manage this tournament.</p>
          <div className="space-y-4">
            <button 
              onClick={() => navigate(`/tournament/swiss/${tournamentId}`)}
              className="btn btn-primary"
            >
              View Tournament
            </button>
            {tournament.isStarted && tournament.players.some(p => p.id === user?.id) && (
              <button 
                onClick={() => navigate(`/tournament/swiss/${tournamentId}/results`)}
                className="btn btn-success block w-full"
              >
                Submit Match Results
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const canStartTournament = Boolean(!tournament?.isStarted && tournament && tournament.players.length >= 2);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Tournament Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'The tournament you\'re looking for doesn\'t exist.'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="btn btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <div className="max-w-6xl mx-auto p-2 sm:p-4 relative z-1">
      <TournamentHeader
        tournament={tournament}
        tournamentId={tournamentId!}
        onStartTournament={handleStartTournament}
        canStartTournament={canStartTournament}
        tournamentType="Swiss"
      />

      {/* Navigation Tabs - Mobile Optimized */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 mb-4 sm:mb-8">
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <nav className="-mb-px flex px-2 sm:px-6 overflow-x-auto scrollbar-hide">
            {[
              { id: 'setup', label: 'Setup', icon: CogIcon, shortLabel: 'Setup' },
              { id: 'players', label: 'Players', icon: UserPlusIcon, shortLabel: 'Players' },
              { id: 'live', label: 'Live Management', icon: FireIcon, shortLabel: 'Live' },
            ].map(({ id, label, icon: Icon, shortLabel }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } min-w-0 flex-shrink-0 py-3 sm:py-4 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center justify-center transition-colors`}
              >
                <Icon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline ml-2">{label}</span>
                <span className="sm:hidden ml-1 text-xs">{shortLabel}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-3 sm:p-6 transition-colors duration-200">
        {activeTab === 'setup' && (
          <TournamentSetupTab
            tournament={tournament}
            onOpenRegistration={handleOpenRegistration}
            onCloseRegistration={handleCloseRegistration}
            onDeleteTournament={() => setShowDeleteConfirm(true)}
            deleting={deleting}
            tournamentType="Swiss"
          />
        )}

        {activeTab === 'players' && (
          <PlayerManagement
            tournament={tournament}
            onAddGuest={handleAddGuest}
            onRemovePlayer={handleRemovePlayer}
            addingGuest={addingGuest}
          />
        )}


        {activeTab === 'live' && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">Live Tournament Management</h2>
            
            {!tournament.isStarted ? (
              <div className="text-center py-8 sm:py-12">
                <FireIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900 dark:text-white">Tournament Not Started</h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4">
                  Start the tournament to access live management features.
                </p>
                {canStartTournament && (
                  <button
                    onClick={handleStartTournament}
                    className="mt-4 btn btn-success text-sm sm:text-base px-4 py-2 sm:px-6 sm:py-3"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Start Tournament
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-8">
                {/* Tournament Status Overview */}
                <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-3 sm:p-6">
                  {tournament.isFinished ? (
                    // Completed Tournament Status
                    <div className="text-center py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-center mb-4 gap-3">
                        <TrophyIcon className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-500 mx-auto sm:mx-0 sm:mr-4" />
                        <div>
                          <h3 className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                            🏁 TOURNAMENT COMPLETE
                          </h3>
                          <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400">
                            Finished • {tournament.players.length} Players • {tournament.rounds.reduce((total, round) => total + round.matches.length, 0)} Matches
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
                        <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                            {tournament.numRounds || 3} / {tournament.numRounds || 3}
                          </div>
                          <div className="text-xs sm:text-sm text-green-600 dark:text-green-400">Rounds Completed</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {tournament.players.length}
                          </div>
                          <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">Total Players</div>
                        </div>
                        <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {tournament.rounds.reduce((total, round) => total + round.matches.length, 0)}
                          </div>
                          <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">Total Matches</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Active Tournament Status
                    <>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Tournament Status</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="text-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                            Round {tournament.currentRound || 1} of {tournament.numRounds || 3}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Current Round</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {tournament.players.length}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Players</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg">
                          <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {tournament.rounds.reduce((total, round) => total + round.matches.length, 0)}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Matches</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Final Standings - Priority for Completed Tournaments */}
                {tournament.isFinished ? (
                  <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-3 sm:p-6">
                    <SwissTournamentStandings
                      players={tournament.players}
                      rounds={tournament.rounds}
                      isFinished={tournament.isFinished}
                    />
                  </div>
                ) : (
                  <>
                    {/* Current Round - Only for Active Tournaments */}
                    <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Current Round</h3>
                        {tournament.rounds[(tournament.currentRound || 1) - 1] && !tournament.rounds[(tournament.currentRound || 1) - 1]?.isComplete && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium">
                              ⚡ Next round starts automatically when all matches complete
                            </div>
                            <button
                              onClick={handleForceRoundCompletion}
                              className="px-3 py-2 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 self-start sm:self-auto"
                            >
                              Force Check Completion
                            </button>
                          </div>
                        )}
                      </div>
                      {tournament.rounds[(tournament.currentRound || 1) - 1] && (
                        <EnhancedSwissTournamentPairings
                          round={tournament.rounds[(tournament.currentRound || 1) - 1]}
                          currentRound={tournament.currentRound || 1}
                          totalRounds={tournament.numRounds || 3}
                          onReportResult={handleReportResult}
                          isOrganizer={true}
                          allowDraws={true}
                          currentUserId={user?.id}
                        />
                      )}
                    </div>

                    {/* Current Standings - Only for Active Tournaments */}
                    <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-3 sm:p-6">
                      <SwissTournamentStandings
                        players={tournament.players}
                        rounds={tournament.rounds}
                        isFinished={tournament.isFinished}
                      />
                    </div>
                  </>
                )}

                {/* Round History - Bottom Section for Completed Tournaments */}
                {tournament.isFinished && (
                  <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-3 sm:p-6">
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer list-none">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                          <FireIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          📋 Round History
                        </h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform">
                          ▼
                        </div>
                      </summary>
                      <div className="mt-4 space-y-4 sm:space-y-6">
                        {tournament.rounds.map((round, index) => (
                          <div key={round.roundNumber} className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 sm:pl-4">
                            <h4 className="text-sm sm:text-md font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">
                              Round {round.roundNumber} {round.isComplete && '✅'}
                            </h4>
                            <div className="space-y-2">
                              {round.matches.map((match, matchIndex) => (
                                <div 
                                  key={match.matchId} 
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs sm:text-sm gap-2 sm:gap-0"
                                >
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                    <span className="font-medium truncate">{match.player1.name}</span>
                                    <span className="text-gray-500">vs</span>
                                    <span className="font-medium truncate">{match.player2.name}</span>
                                  </div>
                                  <div className="text-left sm:text-right">
                                    {match.status === 'completed' ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        {match.result === 'draw' ? 'Draw' : 
                                         match.winnerId === match.player1.id ? `${match.player1.name} Won` : 
                                         `${match.player2.name} Won`}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                        {match.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Show bye players for this round */}
                              {round.byePlayers && round.byePlayers.length > 0 && (
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs sm:text-sm border border-blue-200 dark:border-blue-800 gap-2 sm:gap-0">
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                    <span className="font-medium text-blue-700 dark:text-blue-300">
                                      {round.byePlayers.map(player => player.name).join(', ')}
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400">had BYE</span>
                                  </div>
                                  <div className="text-left sm:text-right">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                      +1 point
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTournament}
        title="Delete Tournament"
        message={`Are you sure you want to delete "${tournament?.name}"? This action cannot be undone and will permanently remove all tournament data, including matches and results.`}
        isDeleting={deleting}
      />
      </div>
    </>
  );
};

export default SwissTournamentManagePage; 