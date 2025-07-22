import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tournamentService, Tournament, TournamentMatch, TournamentType } from '../services/tournament.service';
import { webSocketService } from '../services/websocket.service';
import { TrophyIcon, UserPlusIcon, PlayIcon, TrashIcon, EyeIcon, CogIcon, FireIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import TournamentSetup from '../components/TournamentSetup';
import TournamentBracket from '../components/TournamentBracket';
import SwissTournamentPairings from '../components/SwissTournamentPairings';
import SwissTournamentStandings from '../components/SwissTournamentStandings';
import { TournamentHeader } from '../components/shared/TournamentHeader';
import { PlayerManagement } from '../components/shared/PlayerManagement';
import { TournamentSetupTab } from '../components/shared/TournamentSetupTab';
import { DeleteConfirmModal } from '../components/shared/DeleteConfirmModal';
import { toast } from 'react-hot-toast';
import { MatchResultModal } from '../components/MatchResultModal';

const TournamentManagePage: React.FC = () => {
  const { tournamentId } = useParams();
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
  const [creating, setCreating] = useState(false);
  const [tournamentName, setTournamentName] = useState<string>(() => searchParams.get('eventTitle') || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isBracketExpanded, setIsBracketExpanded] = useState(true);

  // If no tournamentId but eventId is provided, show creation interface
  const isCreating = !tournamentId && eventId;

  const loadTournament = async () => {
    if (!tournamentId) return null;
    
    try {
      setLoading(true);
      const tournamentData = await tournamentService.getTournament(tournamentId);
      if (tournamentData) {
        setTournament(tournamentData);
        
        // Auto-select appropriate tab based on tournament state (only on initial load)
        if (!tournament) {
          // Only auto-switch tabs on initial load
          if (tournamentData.isStarted) {
            setActiveTab('live');
          } else if (tournamentData.players.length > 0) {
            setActiveTab('players');
          } else {
            setActiveTab('setup');
          }
        } else {
          // On updates, only switch to live if tournament starts
          if (tournamentData.isStarted && activeTab !== 'live') {
            setActiveTab('live');
          }
        }
      }
      return tournamentData;
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      loadTournament().catch(console.error);
    }
  }, [tournamentId]);

  // WebSocket handling for real-time updates
  useEffect(() => {
    if (!tournament?.eventId) return undefined;

    console.log('🔌 Setting up WebSocket listeners for tournament:', tournamentId, 'event:', tournament.eventId);
    
    // Ensure WebSocket is connected
    if (!webSocketService.isConnected()) {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        console.log('🔌 Connecting WebSocket with authentication');
        webSocketService.connect(accessToken);
      } else {
        console.log('🔌 Connecting WebSocket anonymously');
        webSocketService.connectAnonymously();
      }
    }
    
    // Join event chat to receive event-wide updates
    webSocketService.joinEventChat(tournament.eventId);
    
    // CRITICAL: Also join the tournament-specific room to receive direct tournament events
    webSocketService.joinTournament(tournamentId);
    console.log('🔌 Joined tournament room:', tournamentId, 'and event room:', tournament.eventId);

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 Tournament Management WebSocket update received:', {
        type: data.type,
        tournamentId: data.tournamentId,
        ourTournamentId: tournamentId,
        fullData: data
      });
      
      // Check if this update is for our tournament
      // Handle both event room format (nested in data) and tournament room format (direct)
      const updateTournamentId = data.tournamentId || (data.tournament && data.tournament.id);
      if (updateTournamentId && updateTournamentId !== tournamentId) {
        console.log('🔕 Ignoring update for different tournament:', updateTournamentId, 'vs our:', tournamentId);
        return;
      }
      
      if (data.type === 'registration-opened' || data.type === 'registration-closed' || 
          data.type === 'player-registered' || data.type === 'player-removed' || 
          data.type === 'tournament-started' || data.type === 'match-result-submitted' || 
          data.type === 'round-started' || data.type === 'tournament-completed') {
        
        // Show notification for player registration
        if (data.type === 'player-registered' && data.player) {
          toast.success(`👤 ${data.player.name || 'A player'} has joined the tournament!`);
        }
        
        if (data.type === 'player-removed' && data.playerId) {
          toast.success(`👤 A player has been removed from the tournament`);
        }
        
        // Call loadTournament for these events that need full refresh
        console.log('🔄 Refreshing tournament data due to:', data.type);
        void loadTournament().catch(error => {
          console.error('Failed to refresh tournament:', error);
        });
        
        // Show notifications for automatic events
        if (data.type === 'round-started' && data.message) {
          toast.success(`🚀 ${data.message}! Round ${data.currentRound} is now active.`);
        }
        
        if (data.type === 'tournament-completed' && data.message) {
          toast.success(`🏆 ${data.message}! The tournament has ended.`);
        }
      } else if (data.type === 'guest-player-added') {
        // Handle guest player addition with full refresh for consistency
        console.log('👤 Guest player added via WebSocket:', data.player);
        
        if (data.player) {
          toast.success(`👤 Guest player "${data.player.name}" has been added to the tournament!`);
        }
        
        // Refresh tournament to ensure consistency
        console.log('🔄 Refreshing tournament data after guest player addition');
        void loadTournament().catch(error => {
          console.error('Failed to refresh tournament:', error);
        });
      } else if (data.type === 'player-registered') {
        // Handle player registration in real-time
        console.log('👤 Player registered via WebSocket:', data);
        
        // Handle both direct tournament room events and nested event room events
        const playerName = data.playerName || (data.player && data.player.name) || 'A player';
        toast.success(`👤 ${playerName} has registered for the tournament!`);
        
        // Update tournament data immediately
        console.log('🔄 Refreshing tournament data after player registration');
        void loadTournament().catch(error => {
          console.error('Failed to refresh tournament:', error);
        });
      } else if (data.type === 'player-unregistered') {
        // Handle player unregistration in real-time
        console.log('👤 Player unregistered via WebSocket:', data);
        
        // Handle both direct tournament room events and nested event room events
        const playerName = data.playerName || (data.player && data.player.name);
        const message = playerName ? `${playerName} has left the tournament` : 'A player has left the tournament';
        toast.info(`👤 ${message}`);
        
        // Update tournament data immediately
        console.log('🔄 Refreshing tournament data after player unregistration');
        void loadTournament().catch(error => {
          console.error('Failed to refresh tournament:', error);
        });
      } else if (data.type === 'tournament-updated' && data.subType) {
        // Handle nested event room updates (tournament-updated with subType)
        console.log('🔄 Tournament updated via event room:', data.subType);
        
        if (data.subType === 'player-registered') {
          const playerName = data.tournament?.players?.slice(-1)[0]?.name || 'A player';
          toast.success(`👤 ${playerName} has registered for the tournament!`);
        } else if (data.subType === 'player-unregistered') {
          toast.info('👤 A player has left the tournament');
        }
        
        // Update tournament data immediately
        console.log('🔄 Refreshing tournament data after tournament-updated event');
        void loadTournament().catch(error => {
          console.error('Failed to refresh tournament:', error);
        });
      }
    };

    // Set up tournament update listener
    webSocketService.onTournamentUpdate(handleTournamentUpdate);
    
    // Also set up specific player registration listeners to catch all events
    webSocketService.onPlayerRegistered((data: any) => {
      console.log('🔔 Specific player-registered event received:', data);
      handleTournamentUpdate({ ...data, type: 'player-registered' });
    });
    
    webSocketService.onPlayerUnregistered((data: any) => {
      console.log('🔔 Specific player-unregistered event received:', data);
      handleTournamentUpdate({ ...data, type: 'player-unregistered' });
    });

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up WebSocket listeners for tournament:', tournamentId);
      webSocketService.removeTournamentListeners();
      webSocketService.leaveTournament(tournamentId);
      if (tournament?.eventId) {
        webSocketService.leaveEventChat(tournament.eventId);
      }
    };
  }, [tournament?.eventId, tournamentId]);

  const handleCreateTournament = async () => {
    if (!eventId || !tournamentName) return;

    setCreating(true);
    try {
      console.log('🎮 Creating tournament from management page:', {
        name: `${tournamentName} Tournament`,
        eventId,
        maxPlayers: 32
      });

      const newTournament = await tournamentService.createTournament(
        eventId,
        `${tournamentName} Tournament`,
        32,
        TournamentType.SINGLE_ELIMINATION,
        3
      );

      console.log('✅ Tournament created successfully:', newTournament);
      navigate(`/tournament/${newTournament.id}/manage`, { replace: true });
    } catch (err) {
      console.error('❌ Failed to create tournament:', err);
      setError('Failed to create tournament. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartTournament = async () => {
    if (!tournamentId) return;

    try {
      await tournamentService.startTournament(tournamentId);
      const updatedTournament = await loadTournament();
      if (updatedTournament) {
        setTournament(updatedTournament);
      }
    } catch (err) {
      console.error('Failed to start tournament:', err);
      alert('Failed to start tournament. Please try again.');
    }
  };

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
      navigate(-1); // Go back to previous page
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

  const handleMatchResult = async (winnerId: string | null, loserId: string | null, isDraw: boolean = false, notes?: string) => {
    if (!tournament || !selectedMatch) return;

    try {
      // Use tournament._id or tournament.id
      const tournamentId = tournament._id || tournament.id;
      if (!tournamentId) {
        console.error('No tournament ID found:', tournament);
        toast.error('Tournament ID not found');
        return;
      }
      
      await tournamentService.submitMatchResult(tournamentId, selectedMatch.matchId, winnerId, loserId, isDraw, notes);
      toast.success('Match result submitted successfully!');
      await loadTournament();
      setShowResultModal(false);
    } catch (error) {
      console.error('Error submitting match result:', error);
      toast.error('Failed to submit match result');
    }
  };

  const handlePlayerMatchResult = async (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => {
    if (!tournament || !user) return;

    const isOrganizer = String(tournament.organizerId) === user.id;
    const isPlayer1 = match.player1.id === user.id;
    const isPlayer2 = match.player2.id === user.id;
    const isParticipant = isPlayer1 || isPlayer2;

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

      // Use tournament._id or tournament.id
      const tournamentId = tournament._id || tournament.id;
      if (!tournamentId) {
        console.error('No tournament ID found:', tournament);
        toast.error('Tournament ID not found');
        return;
      }
      
      await tournamentService.submitMatchResult(tournamentId, match.matchId, winnerId, loserId, isDraw);
      toast.success(
        isOrganizer && match.status !== 'pending'
          ? 'Match result overridden successfully!'
          : 'Match result submitted successfully!'
      );
      await loadTournament();
      setShowResultModal(false);
    } catch (error) {
      console.error('Error submitting match result:', error);
      toast.error('Failed to submit match result');
    }
  };

  const openMatchResultModal = (match: TournamentMatch) => {
    setSelectedMatch(match);
    setShowResultModal(true);
  };

  // Rounds now start automatically when current round is completed

  // Check if user is the organizer
  if (tournament && String(tournament.organizerId) !== user?.id) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have permission to manage this tournament.</p>
          <button 
            onClick={() => navigate(`/tournament/${tournamentId}`)}
            className="btn btn-primary"
          >
            View Tournament
          </button>
        </div>
      </div>
    );
  }

  // If we're in creation mode, show the creation interface
  if (isCreating) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-8 transition-colors duration-200">
          <div className="text-center">
            <TrophyIcon className="h-16 w-16 text-primary-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Tournament</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Set up a tournament for "{eventTitle}" where you can manually add players and manage matches.
            </p>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tournament Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tournament Name
                    </label>
                    <input
                      type="text"
                      value={tournamentName}
                      onChange={(e) => setTournamentName(e.target.value)}
                      className="text-gray-900 dark:text-white bg-white/50 dark:bg-gray-600/50 px-3 py-2 rounded border w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Players
                    </label>
                    <p className="text-gray-900 dark:text-white bg-white/50 dark:bg-gray-600/50 px-3 py-2 rounded border">
                      32 players
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Format
                    </label>
                    <p className="text-gray-900 dark:text-white bg-white/50 dark:bg-gray-600/50 px-3 py-2 rounded border">
                      Single Elimination
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <p className="text-yellow-600 dark:text-yellow-400 bg-white/50 dark:bg-gray-600/50 px-3 py-2 rounded border">
                      Setup Phase
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => navigate(-1)}
                  className="btn btn-secondary px-8"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTournament}
                  className="btn btn-primary px-8"
                  disabled={creating}
                >
                  {creating ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Tournament...
                    </span>
                  ) : (
                    <>
                      <TrophyIcon className="h-4 w-4 mr-2" />
                      Create Tournament
                    </>
                  )}
                </button>
              </div>
            </div>
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
        tournamentType={tournament.type === TournamentType.SWISS ? "Swiss" : "Single Elimination"}
      />

      {/* Navigation Tabs */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 mb-8">
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <nav className="-mb-px flex justify-between items-center px-6">
            <div className="flex space-x-8">
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
            </div>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200">
        {activeTab === 'setup' && (
          <div>
            <TournamentSetupTab
              tournament={tournament}
              onOpenRegistration={handleOpenRegistration}
              onCloseRegistration={handleCloseRegistration}
              tournamentType={tournament.type === TournamentType.SWISS ? "Swiss" : "Single Elimination"}
            />
            
            {/* Public View - Keep this section as it's specific to this page */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Public View</h3>
              <TournamentSetup 
                tournament={tournament} 
              />
            </div>

            {/* Delete Tournament - Moved under Public View */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-danger"
                disabled={deleting}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete Tournament
              </button>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div>
            {/* Player Statistics - Keep this section as it provides additional insights */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Players</h3>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {tournament.players.length}
                </p>
              </div>
              
              <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Registered Users</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {tournament.players.filter(p => !p.isGuest).length}
                </p>
              </div>
              
              <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Guest Players</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {tournament.players.filter(p => p.isGuest).length}
                </p>
              </div>
              
              <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Available Spots</h3>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {tournament.maxPlayers - tournament.players.length}
                </p>
              </div>
            </div>

            {/* Guest Player Instructions */}
            {!tournament.isStarted && (
              <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-300">Adding Guest Players</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Use the form below to add guest players who don't have accounts. Guest players can participate in the tournament but won't be able to report their own results.
                </p>
              </div>
            )}

            <PlayerManagement
              tournament={tournament}
              onAddGuest={handleAddGuest}
              onRemovePlayer={handleRemovePlayer}
              addingGuest={addingGuest}
            />
          </div>
        )}


        {activeTab === 'live' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Live Tournament Management</h2>
            
            {/* Tournament Winner/Leader Section */}
            {(() => {
              // Determine winner from completed matches if backend hasn't set winnerId
              const determineWinner = () => {
                if (tournament.winnerId) {
                  return tournament.winnerId;
                }
                
                // For single elimination, find the final match winner
                const finalRound = tournament.rounds?.find(round => 
                  round.roundName?.toLowerCase().includes('final') || 
                  round.roundNumber === tournament.rounds.length
                );
                
                if (finalRound) {
                  const finalMatch = finalRound.matches?.find(match => 
                    match.status === 'completed' && match.winnerId
                  );
                  
                  if (finalMatch) {
                    return finalMatch.winnerId;
                  }
                }
                
                return null;
              };
              
              const determineTournamentCompletion = () => {
                if (tournament.isFinished) {
                  return true;
                }
                
                // For single elimination, check if final match is completed
                const finalRound = tournament.rounds?.find(round => 
                  round.roundName?.toLowerCase().includes('final') || 
                  round.roundNumber === tournament.rounds.length
                );
                
                if (finalRound) {
                  const finalMatch = finalRound.matches?.find(match => 
                    match.status === 'completed' && match.winnerId
                  );
                  
                  if (finalMatch) {
                    return true;
                  }
                }
                
                return false;
              };
              
              const currentWinnerId = determineWinner();
              const isTournamentCompleted = determineTournamentCompletion();
              
              return currentWinnerId && (
              <div className="mb-8">
                <div className={`bg-gradient-to-r rounded-lg p-6 border ${
                  isTournamentCompleted 
                    ? 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800' 
                    : 'from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800'
                }`}>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-3">
                        {isTournamentCompleted ? '🏆' : '👑'}
                      </div>
                      <div className="text-2xl font-bold mb-2">
                        <span className={isTournamentCompleted ? 'text-yellow-800 dark:text-yellow-200' : 'text-green-800 dark:text-green-200'}>
                          {tournament.players.find(p => p.id === currentWinnerId)?.name || 'Champion'}
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${
                        isTournamentCompleted 
                          ? 'text-yellow-600 dark:text-yellow-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {isTournamentCompleted ? 'Tournament Champion' : 'Current Tournament Leader'}
                      </div>
                      {!isTournamentCompleted && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Tournament in progress
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}
            
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

                {/* Quick Actions - Only show if tournament is not completed */}
                {(() => {
                  // Determine tournament completion status
                  const determineTournamentCompletion = () => {
                    if (tournament.isFinished) {
                      return true;
                    }
                    
                    // For single elimination, check if final match is completed
                    if (tournament.type === TournamentType.SINGLE_ELIMINATION) {
                      const finalRound = tournament.rounds?.find(round => 
                        round.roundName?.toLowerCase().includes('final') || 
                        round.roundNumber === tournament.rounds.length
                      );
                      
                      if (finalRound) {
                        const finalMatch = finalRound.matches?.find(match => 
                          match.status === 'completed' && match.winnerId
                        );
                        
                        if (finalMatch) {
                          return true;
                        }
                      }
                    }
                    
                    return false;
                  };

                  const isTournamentCompleted = determineTournamentCompletion();
                  
                  return !isTournamentCompleted && (
                    <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6 relative z-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => navigate(`/tournament/${tournament?.type === TournamentType.SWISS ? 'swiss' : 'single-elimination'}/${tournamentId}/results`)}
                          className="btn btn-primary"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          View Results Page
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Tournament Display with Management Features */}
                <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6 relative z-1">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {tournament.type === TournamentType.SWISS ? 'Current Round Matchups' : 'Tournament Bracket'}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Manage matches and view real-time progress
                    </div>
                  </div>
                  
                  {tournament.type === TournamentType.SWISS ? (
                    <div className="space-y-6">
                      {/* Current Round for Swiss Tournament */}
                      {tournament.rounds && tournament.rounds.length > 0 ? (
                        <div>
                          {/* Current active round or most recent round */}
                          {(() => {
                            const currentRoundNumber = tournament.currentRound || 1;
                            const currentRound = tournament.rounds.find(r => r.roundNumber === currentRoundNumber) || 
                                                tournament.rounds[tournament.rounds.length - 1];
                            
                            if (!currentRound) {
                              return (
                                <div className="text-center py-8">
                                  <p className="text-gray-500 dark:text-gray-400">No rounds available</p>
                                </div>
                              );
                            }
                            
                            return (
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Round {currentRound.roundNumber} 
                                    {currentRound.isComplete ? ' (Complete)' : ' (In Progress)'}
                                  </h4>
                                  <div className="flex items-center gap-4">
                                    {!tournament.isFinished && !currentRound.isComplete && (
                                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                        ⚡ Next round starts automatically when all matches complete
                                      </div>
                                    )}
                                    {currentRound.byePlayers && currentRound.byePlayers.length > 0 && (
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Bye: {currentRound.byePlayers.map(p => p.name).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <SwissTournamentPairings
                                  round={currentRound}
                                  currentRound={tournament.currentRound || 1}
                                  totalRounds={tournament.numRounds || 3}
                                  onReportResult={(match) => openMatchResultModal(match)}
                                  isOrganizer={String(tournament.organizerId) === user?.id}
                                  allowDraws={true}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500 dark:text-gray-400">
                            No matches have been generated yet. Start the tournament to generate first round pairings.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Single Elimination Tournament */
                    <div className="space-y-6">
                      {/* Current Round Section for Single Elimination - Hide if tournament is completed */}
                      {(() => {
                        // Check if tournament is completed
                        const determineTournamentCompletion = () => {
                          if (tournament.isFinished) {
                            return true;
                          }
                          
                          // For single elimination, check if final match is completed
                          if (tournament.type === TournamentType.SINGLE_ELIMINATION) {
                            const finalRound = tournament.rounds?.find(round => 
                              round.roundName?.toLowerCase().includes('final') || 
                              round.roundNumber === tournament.rounds.length
                            );
                            
                            if (finalRound) {
                              const finalMatch = finalRound.matches?.find(match => 
                                match.status === 'completed' && match.winnerId
                              );
                              
                              if (finalMatch) {
                                return true;
                              }
                            }
                          }
                          
                          return false;
                        };

                        const isTournamentCompleted = determineTournamentCompletion();
                        
                        return !isTournamentCompleted && tournament.rounds && tournament.rounds.length > 0 && (
                          <>
                            {/* Find the current active round (first incomplete round) */}
                            {(() => {
                              const activeRound = tournament.rounds.find(r => !r.isComplete);
                              if (!activeRound) {
                                return null; // All rounds complete or no active round
                              }
                              
                              return (
                                <div>
                                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                                        Current Round: {(() => {
                                          const totalRounds = tournament.rounds.length;
                                          const roundsFromEnd = totalRounds - activeRound.roundNumber + 1;
                                          
                                          switch (roundsFromEnd) {
                                            case 1: return 'Final';
                                            case 2: return 'Semi-Final';
                                            case 3: return 'Quarter-Final';
                                            default: return `Round ${activeRound.roundNumber}`;
                                          }
                                        })()}
                                      </h4>
                                      <span className="text-sm text-blue-700 dark:text-blue-300">
                                        {activeRound.matches.filter(m => m.status === 'completed').length} of {activeRound.matches.length} matches completed
                                      </span>
                                    </div>
                                    
                                    {/* Use TournamentBracket component for proper match handling */}
                                    <div className="current-round-bracket" style={{ marginTop: '1rem' }}>
                                      <TournamentBracket 
                                        tournament={{
                                          ...tournament,
                                          rounds: [activeRound] // Only show the active round
                                        }} 
                                        onTournamentUpdate={setTournament}
                                        isManageMode={true}
                                        hideRoundHeaders={true}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        );
                      })()}
                      
                      {/* Full Tournament Bracket - Expandable */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setIsBracketExpanded(!isBracketExpanded)}
                          className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                        >
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Tournament Bracket
                          </h4>
                          {isBracketExpanded ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                        
                        {isBracketExpanded && (
                          <div className="p-6 bg-white dark:bg-gray-900">
                            <TournamentBracket 
                              tournament={tournament} 
                              onTournamentUpdate={setTournament}
                              isManageMode={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
        message="Permanently delete this tournament and all its data. This action cannot be undone."
        isDeleting={deleting}
      />

      {/* Match Result Modal */}
      {selectedMatch && (
        <MatchResultModal
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setSelectedMatch(null);
          }}
          match={selectedMatch}
          currentUserId={user?.id || ''}
          isCreator={String(tournament?.organizerId) === user?.id}
          onSubmitResult={handleMatchResult}
          onConfirmResult={async () => {
            if (!tournament || !selectedMatch) return;
            const tournamentId = tournament._id || tournament.id;
            if (!tournamentId) {
              toast.error('Tournament ID not found');
              return;
            }
            await tournamentService.confirmMatchResult(tournamentId, selectedMatch.matchId);
            toast.success('Match result confirmed!');
            await loadTournament();
            setShowResultModal(false);
          }}
          onDisputeResult={async (reason) => {
            if (!tournament || !selectedMatch) return;
            const tournamentId = tournament._id || tournament.id;
            if (!tournamentId) {
              toast.error('Tournament ID not found');
              return;
            }
            await tournamentService.disputeMatchResult(tournamentId, selectedMatch.matchId, reason);
            toast.success('Match result disputed');
            await loadTournament();
            setShowResultModal(false);
          }}
          onResolveDispute={async (winnerId, loserId, isDraw, notes) => {
            if (!tournament || !selectedMatch) return;
            const tournamentId = tournament._id || tournament.id;
            if (!tournamentId) {
              toast.error('Tournament ID not found');
              return;
            }
            await tournamentService.resolveMatchDispute(tournamentId, selectedMatch.matchId, winnerId, loserId, isDraw, notes);
            toast.success('Dispute resolved');
            await loadTournament();
            setShowResultModal(false);
          }}
          onForfeit={async (forfeitingPlayerId) => {
            if (!tournament || !selectedMatch) return;
            const tournamentId = tournament._id || tournament.id;
            if (!tournamentId) {
              toast.error('Tournament ID not found');
              return;
            }
            await tournamentService.forfeitMatch(tournamentId, selectedMatch.matchId, forfeitingPlayerId);
            toast.success('Match forfeited');
            await loadTournament();
            setShowResultModal(false);
          }}
          isSingleElimination={tournament?.type === TournamentType.SINGLE_ELIMINATION}
        />
      )}
    </div>
  );
};

export default TournamentManagePage; 