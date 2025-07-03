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

  // WebSocket handling for real-time updates
  useEffect(() => {
    if (!tournament?.eventId) return;

    webSocketService.joinEventChat(tournament.eventId);

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 Tournament Management WebSocket update received:', data);
      
      if (data.type === 'registration-opened' || data.type === 'registration-closed' || 
          data.type === 'player-registered' || data.type === 'guest-player-added' ||
          data.type === 'player-removed' || data.type === 'tournament-started' ||
          data.type === 'match-result-submitted' || data.type === 'round-started' ||
          data.type === 'tournament-completed') {
        // Refresh tournament data when there are updates
        const refreshTournament = async () => {
          try {
            if (tournamentId) {
              const updatedTournament = await tournamentService.getTournament(tournamentId);
              setTournament(updatedTournament);
            }
          } catch (error) {
            console.error('❌ Error refreshing tournament data:', error);
          }
        };
        refreshTournament();
        
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
      const updatedTournament = await tournamentService.addGuestPlayer(tournamentId, name.trim());
      setTournament(updatedTournament);
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
      const updatedTournament = await tournamentService.removePlayer(tournamentId, playerId);
      setTournament(updatedTournament);
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

  const handleReportResult = async (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => {
    if (!tournament || !user) return;

    // Check if match is already completed to prevent double submission
    if (match.status === 'completed') {
      toast.error('This match has already been completed');
      return;
    }

    const isOrganizer = String(tournament.organizerId) === user.id;
    const isPlayer1 = match.player1.id === user.id;
    const isPlayer2 = match.player2.id === user.id;
    const isParticipant = isPlayer1 || isPlayer2;

    console.log('🏓 Submitting result for match:', {
      matchId: match.matchId,
      currentStatus: match.status,
      result,
      isOrganizer,
      tournamentId: tournament.id
    });

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

      // Use override method since this is admin action on management page
      let updatedTournament;
      if (isDraw) {
        // For draws, set both to null and specify result as 'draw'
        updatedTournament = await tournamentService.overrideMatchResult(
          tournament.id, 
          match.matchId, 
          null, 
          null,
          'completed',
          'draw'
        );
      } else {
        updatedTournament = await tournamentService.overrideMatchResult(
          tournament.id, 
          match.matchId, 
          winnerId!, 
          loserId!,
          'completed',
          'win'
        );
      }
      
      // Immediately update the tournament state to prevent race conditions
      setTournament(updatedTournament);
      
      // Also force a refresh after a short delay to ensure consistency
      setTimeout(async () => {
        try {
          const refreshedTournament = await tournamentService.getTournament(tournament.id);
          setTournament(refreshedTournament);
        } catch (refreshError) {
          console.error('Error refreshing tournament after result submission:', refreshError);
        }
      }, 500);

      toast.success(
        isOrganizer && match.status !== 'pending'
          ? 'Match result overridden successfully!'
          : 'Match result submitted successfully!'
      );
    } catch (error) {
      console.error('Error submitting match result:', error);
      
      // Refresh tournament state even on error to ensure UI is consistent
      try {
        const refreshedTournament = await tournamentService.getTournament(tournament.id);
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

  const canStartTournament = !tournament?.isStarted && tournament && tournament.players.length >= 2;

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
    <div className="max-w-6xl mx-auto p-4 relative z-1">
      <TournamentHeader
        tournament={tournament}
        tournamentId={tournamentId!}
        onStartTournament={handleStartTournament}
        canStartTournament={canStartTournament}
        tournamentType="Swiss"
      />

      {/* Navigation Tabs */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 mb-8">
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'setup', label: 'Setup', icon: CogIcon },
              { id: 'players', label: 'Players', icon: UserPlusIcon },
              { id: 'live', label: 'Live Management', icon: FireIcon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200">
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Live Tournament Management</h2>
            
            {!tournament.isStarted ? (
              <div className="text-center py-12">
                <FireIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Tournament Not Started</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Start the tournament to access live management features.
                </p>
                {canStartTournament && (
                  <button
                    onClick={handleStartTournament}
                    className="mt-4 btn btn-success"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Start Tournament
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Tournament Status Overview */}
                <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tournament Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        Round {tournament.currentRound || 1} of {tournament.numRounds || 3}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Current Round</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {tournament.players.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Players</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {tournament.rounds.reduce((total, round) => total + round.matches.length, 0)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Matches</div>
                    </div>
                  </div>
                </div>

                {/* Current Round */}
                <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Round</h3>
                    {!tournament.isFinished && tournament.rounds[(tournament.currentRound || 1) - 1] && !tournament.rounds[(tournament.currentRound || 1) - 1]?.isComplete && (
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        ⚡ Next round starts automatically when all matches complete
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

                {/* Standings */}
                <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Standings</h3>
                  <SwissTournamentStandings
                    players={tournament.players}
                    isFinished={tournament.isFinished}
                  />
                </div>
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
  );
};

export default SwissTournamentManagePage; 