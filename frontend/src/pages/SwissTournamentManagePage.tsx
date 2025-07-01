import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tournamentService, Tournament, TournamentMatch } from '../services/tournament.service';
import { webSocketService } from '../services/websocket.service';
import { TrophyIcon, UserPlusIcon, PlayIcon, TrashIcon, EyeIcon, CogIcon, FireIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import SwissTournamentPairings from '../components/SwissTournamentPairings';
import SwissTournamentStandings from '../components/SwissTournamentStandings';
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
  const [activeTab, setActiveTab] = useState<'setup' | 'players' | 'rounds' | 'live'>('setup');
  const [guestName, setGuestName] = useState('');
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
          data.type === 'match-result-submitted' || data.type === 'round-started') {
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

  const handleStartNextRound = async () => {
    if (!tournamentId) return;

    try {
      await tournamentService.startNextRound(tournamentId);
      const updatedTournament = await tournamentService.getTournament(tournamentId);
      setTournament(updatedTournament);
    } catch (err) {
      console.error('Failed to start next round:', err);
      alert('Failed to start next round. Please try again.');
    }
  };

  const handleAddGuest = async () => {
    if (!tournamentId || !guestName.trim()) return;

    setAddingGuest(true);
    try {
      const updatedTournament = await tournamentService.addGuestPlayer(tournamentId, guestName.trim());
      setTournament(updatedTournament);
      setGuestName('');
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

    const isOrganizer = tournament.organizerId === user.id;
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

      await tournamentService.submitMatchResult(tournament.id, match.matchId, winnerId, loserId, isDraw);
      toast.success(
        isOrganizer && match.status !== 'pending'
          ? 'Match result overridden successfully!'
          : 'Match result submitted successfully!'
      );
      loadTournament();
    } catch (error) {
      console.error('Error submitting match result:', error);
      toast.error('Failed to submit match result');
    }
  };

  // Check if user is the organizer
  if (tournament && tournament.organizerId !== user?.id) {
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
      {/* Tournament Header */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200 mb-8 relative z-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CogIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{tournament.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">Swiss Tournament Management</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/tournament/swiss/${tournamentId}`)}
              className="btn btn-secondary"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              Public View
            </button>
            
            {canStartTournament && (
              <button
                onClick={handleStartTournament}
                className="btn btn-success"
              >
                <PlayIcon className="h-4 w-4 mr-2" />
                Start Tournament
              </button>
            )}
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 relative z-1">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Players</h3>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {tournament.players.length} / {tournament.maxPlayers}
            </p>
          </div>
          
          <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 relative z-1">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Status</h3>
            <p className={`text-lg font-bold ${
              tournament.isFinished 
                ? 'text-gray-600 dark:text-gray-400' 
                : tournament.isStarted 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {tournament.isFinished ? 'Finished' : tournament.isStarted ? 'In Progress' : 'Setup'}
            </p>
          </div>
          
          <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 relative z-1">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Current Round</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {(tournament.currentRound || 0)} / {(tournament.numRounds || 3)}
            </p>
          </div>
          
          <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 relative z-1">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Matches</h3>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {tournament.rounds.reduce((total, round) => total + round.matches.length, 0)}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'setup', label: 'Setup', icon: CogIcon },
              { id: 'players', label: 'Players', icon: UserPlusIcon },
              { id: 'rounds', label: 'Rounds', icon: TrophyIcon },
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
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Tournament Setup</h2>
            
            {/* Registration Management */}
            {!tournament.isStarted && (
              <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Registration Management</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleOpenRegistration}
                    className={`btn ${tournament.registrationOpen ? 'btn-success opacity-50 cursor-not-allowed' : 'btn-success'}`}
                    disabled={tournament.isStarted || tournament.registrationOpen}
                  >
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    {tournament.registrationOpen ? 'Registration Open' : 'Open Registration'}
                  </button>
                  <button
                    onClick={handleCloseRegistration}
                    className={`btn ${!tournament.registrationOpen ? 'btn-warning opacity-50 cursor-not-allowed' : 'btn-warning'}`}
                    disabled={tournament.isStarted || !tournament.registrationOpen}
                  >
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    {!tournament.registrationOpen ? 'Registration Closed' : 'Close Registration'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Control when players can register for your tournament. Registration is automatically closed when the tournament starts.
                </p>
              </div>
            )}

            {/* Tournament Info */}
            <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tournament Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tournament Name</label>
                  <p className="mt-1 text-gray-900 dark:text-white">{tournament.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Format</label>
                  <p className="mt-1 text-gray-900 dark:text-white">Swiss Tournament</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Rounds</label>
                  <p className="mt-1 text-gray-900 dark:text-white">{tournament.numRounds || 3}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Players</label>
                  <p className="mt-1 text-gray-900 dark:text-white">{tournament.maxPlayers}</p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-4">Danger Zone</h3>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-300">Delete Tournament</h4>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Permanently delete this tournament and all its data. This action cannot be undone.
                  </p>
                </div>
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
          </div>
        )}

        {activeTab === 'players' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Player Management</h2>
              
              {!tournament.isStarted && (
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Guest player name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="input"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddGuest()}
                  />
                  <button
                    onClick={handleAddGuest}
                    disabled={!guestName.trim() || addingGuest}
                    className="btn btn-primary"
                  >
                    {addingGuest ? 'Adding...' : 'Add Guest'}
                  </button>
                </div>
              )}
            </div>

            {/* Player List */}
            <div className="space-y-4">
              {/* Registered Users Section */}
              {tournament.players.filter(p => !p.isGuest).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Registered Users ({tournament.players.filter(p => !p.isGuest).length})
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {tournament.players.filter(p => !p.isGuest).map((player, index) => (
                      <div 
                        key={player.id}
                        className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4">
                            {tournament.players.indexOf(player) + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{player.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Registered User • {player.username || 'No username'}
                            </p>
                          </div>
                        </div>
                        
                        {!tournament.isStarted && (
                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="btn btn-danger-outline btn-sm"
                            title="Remove Player"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guest Players Section */}
              {tournament.players.filter(p => p.isGuest).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Guest Players ({tournament.players.filter(p => p.isGuest).length})
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {tournament.players.filter(p => p.isGuest).map((player, index) => (
                      <div 
                        key={player.id}
                        className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4">
                            G{index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{player.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Guest Player • Added by organizer
                            </p>
                          </div>
                        </div>
                        
                        {!tournament.isStarted && (
                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="btn btn-danger-outline btn-sm"
                            title="Remove Player"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tournament.players.length === 0 && (
                <div className="text-center py-12">
                  <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No players yet</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Players will appear here as they register, or you can add guest players using the form above.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rounds' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tournament Rounds</h2>
              
              {tournament.isStarted && !tournament.isFinished && (tournament.currentRound || 0) < (tournament.numRounds || 3) && (
                <button
                  onClick={handleStartNextRound}
                  className="btn btn-primary"
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Start Round {(tournament.currentRound || 0) + 1}
                </button>
              )}
            </div>

            {/* Rounds List */}
            <div className="space-y-8">
              {tournament.rounds.map((round, index) => (
                <div key={index} className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6">
                  <SwissTournamentPairings
                    round={round}
                    currentRound={tournament.currentRound || 1}
                    totalRounds={tournament.numRounds || 3}
                    onReportResult={handleReportResult}
                    isOrganizer={true}
                    allowDraws={true}
                  />
                </div>
              ))}
            </div>
          </div>
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
                    {!tournament.isFinished && (tournament.currentRound || 0) < (tournament.numRounds || 3) && (
                      <button
                        onClick={handleStartNextRound}
                        className="btn btn-primary"
                        disabled={!tournament.rounds[(tournament.currentRound || 1) - 1]?.isComplete}
                      >
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Start Next Round
                      </button>
                    )}
                  </div>
                  {tournament.rounds[(tournament.currentRound || 1) - 1] && (
                    <SwissTournamentPairings
                      round={tournament.rounds[(tournament.currentRound || 1) - 1]}
                      currentRound={tournament.currentRound || 1}
                      totalRounds={tournament.numRounds || 3}
                      onReportResult={handleReportResult}
                      isOrganizer={true}
                      allowDraws={true}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 999999 }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" style={{ zIndex: 1000000 }}>
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Tournament
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{tournament?.name}"? This action cannot be undone and will permanently remove all tournament data, including matches and results.
            </p>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTournament}
                className="btn btn-danger"
                disabled={deleting}
              >
                {deleting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Tournament
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwissTournamentManagePage; 