import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Tournament, TournamentMatch, TournamentPlayer, TournamentType, TournamentRound } from '../services/tournament.service';
import { tournamentService } from '../services/tournament.service';
import SwissTournamentPairings from '../components/SwissTournamentPairings';
import SwissTournamentStandings from '../components/SwissTournamentStandings';
import { PlayIcon, UserPlusIcon, XMarkIcon, TrophyIcon, UserGroupIcon, CalendarIcon, CheckIcon } from '@heroicons/react/24/outline';
import TournamentCreationForm from '../components/TournamentCreationForm';
import { EventFeatures } from '../types/event';
import { log, LogCategory } from '../utils/logger';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const SwissTournament: React.FC = () => {
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
  const [newPlayerName, setNewPlayerName] = useState('');

  // Check if current user is the event creator
  const isEventCreator = user && eventCreatorId && user.id === eventCreatorId;

  // Check if current user is registered
  const isUserRegistered = tournament && user && tournament.players.some(p => p.userId === user.id);

  // Check if user can register
  const canRegister = user && !isUserRegistered && !tournament?.isStarted && !tournament?.isFinished && tournament?.registrationOpen !== false;

  useEffect(() => {
    if (tournamentId) {
      // If we have a tournament ID, load that specific tournament
      loadTournamentById(tournamentId);
    } else if (eventId) {
      // If we have an event ID but no tournament ID, check for existing tournaments
      loadTournamentByEvent();
    } else {
      setLoading(false);
    }
  }, [tournamentId, eventId]);

  const loadTournamentById = async (id: string) => {
    try {
      const tournament = await tournamentService.getTournament(id);
      setTournament(tournament);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentByEvent = async () => {
    try {
      const tournaments = await tournamentService.getTournamentsByEvent(eventId);
      if (tournaments.length > 0) {
        setTournament(tournaments[0]);
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!tournament || !newPlayerName.trim()) return;

    try {
      await tournamentService.addGuestPlayer(tournament.id, newPlayerName.trim());
      setNewPlayerName('');
      if (tournamentId) {
        loadTournamentById(tournamentId);
      } else {
        loadTournamentByEvent();
      }
    } catch (err) {
      setError('Failed to add player');
      console.error(err);
    }
  };

  const handleCreateTournament = async () => {
    try {
      log.info(LogCategory.TOURNAMENT, 'Creating Swiss tournament', {
        eventId,
        eventTitle,
        eventCreatorId,
        userId: user?.id,
        username: user?.username
      });

      // First, validate that the event exists
      try {
        const eventResponse = await fetch(`http://localhost:3001/api/events/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        
        if (!eventResponse.ok) {
          if (eventResponse.status === 404) {
            throw new Error(`Event with ID ${eventId} does not exist. Please check the event ID and try again.`);
          }
          throw new Error(`Failed to validate event: ${eventResponse.status} ${eventResponse.statusText}`);
        }
      } catch (validationError) {
        log.error(LogCategory.TOURNAMENT, 'Event validation failed', validationError);
        const errorMessage = validationError instanceof Error ? validationError.message : 'Unknown validation error';
        setError(`Cannot create tournament: ${errorMessage}`);
        return;
      }

      const type = TournamentType.SWISS;

      // Create tournament via backend API
      const backendTournament = await tournamentService.createTournament(
        eventId,
        `${eventTitle} Tournament`,
        32, // Default max players
        type,
        3 // Default 3 rounds for Swiss tournaments
      );
      
      log.info(LogCategory.TOURNAMENT, 'Swiss tournament created successfully', { backendTournament });
      
      // Navigate to the tournament management page
      navigate(`/tournament/swiss/${backendTournament.id}/manage?eventId=${eventId}&eventTitle=${encodeURIComponent(eventTitle)}&creatorId=${eventCreatorId}`);
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to create Swiss tournament', error);
      setError('Failed to create tournament. Please try again.');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!tournament) return;

    try {
      await tournamentService.removePlayer(tournament.id, playerId);
      if (tournamentId) {
        loadTournamentById(tournamentId);
      } else {
        loadTournamentByEvent();
      }
    } catch (err) {
      setError('Failed to remove player');
      console.error(err);
    }
  };

  const handleStartTournament = async () => {
    if (!tournament) return;

    try {
      await tournamentService.startTournament(tournament.id);
      if (tournamentId) {
        loadTournamentById(tournamentId);
      } else {
        loadTournamentByEvent();
      }
    } catch (err) {
      setError('Failed to start tournament');
      console.error(err);
    }
  };

  const handleReportResult = async (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => {
    if (!tournament) return;

    try {
      if (result === 'draw') {
        await tournamentService.submitMatchResult(tournament.id, match.matchId, null, true);
      } else if (result === 'win') {
        await tournamentService.submitMatchResult(tournament.id, match.matchId, match.player1.id, false);
      } else {
        await tournamentService.submitMatchResult(tournament.id, match.matchId, match.player2.id, false);
      }
      if (tournamentId) {
        loadTournamentById(tournamentId);
      } else {
        loadTournamentByEvent();
      }
    } catch (err) {
      setError('Failed to report result');
      console.error(err);
    }
  };

  const handleRegisterForTournament = async () => {
    if (!tournament) return;

    try {
      await tournamentService.registerForTournament(tournament.id);
      if (tournamentId) {
        loadTournamentById(tournamentId);
      } else {
        loadTournamentByEvent();
      }
      // Show success notification
      toast.success('Successfully registered for tournament!');
    } catch (err) {
      setError('Failed to register for tournament');
      console.error(err);
    }
  };

  const handleUnregisterFromTournament = async () => {
    if (!tournament || !user) return;

    try {
      await tournamentService.removePlayer(tournament.id, user.id);
      if (tournamentId) {
        loadTournamentById(tournamentId);
      } else {
        loadTournamentByEvent();
      }
    } catch (err) {
      setError('Failed to unregister from tournament');
      console.error(err);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Show tournament creation page only for event creators, or coming soon for others
  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Tournament Title */}
          <div className="text-center mb-8">
            <TrophyIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tournament for "{eventTitle}"</h1>
            <p className="text-gray-600 dark:text-gray-400">Registration is now open!</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-full p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <UserPlusIcon className="h-8 w-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Join the Tournament</h1>
                <p className="text-gray-600 dark:text-gray-400">Register now to participate in this Swiss tournament!</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Swiss</h2>
                <p className="text-gray-600 dark:text-gray-400">Tournament Format</p>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">{tournament?.players?.length || 0}</h2>
                <p className="text-gray-600 dark:text-gray-400">Players Registered</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tournament Details</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>Swiss format - play multiple rounds regardless of wins/losses</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>First round pairings are random</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>After first round, players are paired based on their tournament score</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>Each round, players face opponents with similar records</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>Matches can end in a win, loss, or draw</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>Tournament starts when registration closes</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>You can unregister before the tournament starts</span>
                </li>
              </ul>
            </div>

            {isEventCreator ? (
              <TournamentCreationForm
                eventId={eventId}
                eventFeature={EventFeatures.SWISS_TOURNAMENT}
                onTournamentCreated={handleCreateTournament}
                defaultName={`${eventTitle} Tournament`}
              />
            ) : isUserRegistered ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <CheckIcon className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 dark:text-green-400 font-medium">You're registered and ready to compete!</p>
              </div>
            ) : (
              <button
                onClick={handleRegisterForTournament}
                className="w-full flex justify-center items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-colors"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Register Now
              </button>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
              By registering, you agree to participate in the tournament when it begins.
            </p>
          </div>

          {/* Players List */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Players ({tournament?.players?.length || 0})</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Updated {new Date().toLocaleTimeString()}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
              {/* Registered Players Section */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Registered Players ({tournament?.players?.filter(p => !p.isGuest)?.length || 0})
                </h3>
                {tournament?.players?.filter(p => !p.isGuest)?.length ? (
                  <ul className="space-y-3">
                    {tournament?.players
                      ?.filter(p => !p.isGuest)
                      ?.map((player, index) => (
                        <li key={player.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-gray-900 dark:text-white font-medium">{player.name}</span>
                                {player.userId === user?.id && (
                                  <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Registered: {format(new Date(player.registeredAt || Date.now()), 'M/d/yyyy, h:mm a')}
                              </span>
                            </div>
                          </div>
                          {isEventCreator && tournament && !tournament.isStarted && (
                            <button
                              onClick={() => handleRemovePlayer(player.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">No registered players yet</p>
                )}
              </div>

              {/* Guest Players Section */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Guests ({tournament?.players?.filter(p => p.isGuest)?.length || 0})
                  </h3>
                  {isEventCreator && tournament && !tournament.isStarted && (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="Guest name"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleAddPlayer}
                        disabled={!newPlayerName.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow transition-colors flex items-center"
                      >
                        <UserPlusIcon className="h-5 w-5 mr-1" />
                        Add
                      </button>
                    </div>
                  )}
                </div>
                
                {tournament?.players?.filter(p => p.isGuest)?.length ? (
                  <ul className="space-y-3">
                    {tournament?.players
                      ?.filter(p => p.isGuest)
                      ?.map((player, index) => (
                        <li key={player.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mr-3">
                              G{index + 1}
                            </div>
                            <div>
                              <span className="text-gray-900 dark:text-white font-medium">{player.name}</span>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Registered: {format(new Date(player.registeredAt || Date.now()), 'M/d/yyyy, h:mm a')}
                              </div>
                            </div>
                          </div>
                          {isEventCreator && tournament && !tournament.isStarted && (
                            <button
                              onClick={() => handleRemovePlayer(player.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">No guest players yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show registration page only when registration is open and user is not registered
  if (!isEventCreator && tournament.status === 'registration_open' && !isUserRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Tournament Title */}
          <div className="text-center mb-8">
            <TrophyIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tournament for "{eventTitle}"</h1>
            <p className="text-gray-600 dark:text-gray-400">Registration is now open!</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center mb-8">
              <div className="text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-full p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <UserPlusIcon className="h-8 w-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Join the Tournament</h1>
                <p className="text-gray-600 dark:text-gray-400">Register now to participate in this Swiss tournament!</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Swiss</h2>
                <p className="text-gray-600 dark:text-gray-400">Tournament Format</p>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">{tournament?.players?.length || 0}</h2>
                <p className="text-gray-600 dark:text-gray-400">Players Registered</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tournament Details</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>Swiss format - play multiple rounds regardless of wins/losses</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>First round pairings are random</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>After first round, players are paired based on their tournament score</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>Each round, players face opponents with similar records</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>Matches can end in a win, loss, or draw</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>Tournament starts when registration closes</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">•</span>
                  <span>You can unregister before the tournament starts</span>
                </li>
              </ul>
            </div>

            {isEventCreator ? (
              <TournamentCreationForm
                eventId={eventId}
                eventFeature={EventFeatures.SWISS_TOURNAMENT}
                onTournamentCreated={handleCreateTournament}
                defaultName={`${eventTitle} Tournament`}
              />
            ) : isUserRegistered ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <CheckIcon className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-green-700 dark:text-green-400 font-medium">You're registered and ready to compete!</p>
              </div>
            ) : (
              <button
                onClick={handleRegisterForTournament}
                className="w-full flex justify-center items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-colors"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Register Now
              </button>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
              By registering, you agree to participate in the tournament when it begins.
            </p>
          </div>

          {/* Players List */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Players ({tournament?.players?.length || 0})</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Updated {new Date().toLocaleTimeString()}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
              {/* Registered Players Section */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Registered Players ({tournament?.players?.filter(p => !p.isGuest)?.length || 0})
                </h3>
                {tournament?.players?.filter(p => !p.isGuest)?.length ? (
                  <ul className="space-y-3">
                    {tournament?.players
                      ?.filter(p => !p.isGuest)
                      ?.map((player, index) => (
                        <li key={player.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-gray-900 dark:text-white font-medium">{player.name}</span>
                                {player.userId === user?.id && (
                                  <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Registered: {format(new Date(player.registeredAt || Date.now()), 'M/d/yyyy, h:mm a')}
                              </span>
                            </div>
                          </div>
                          {isEventCreator && tournament && !tournament.isStarted && (
                            <button
                              onClick={() => handleRemovePlayer(player.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">No registered players yet</p>
                )}
              </div>

              {/* Guest Players Section */}
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Guests ({tournament?.players?.filter(p => p.isGuest)?.length || 0})
                  </h3>
                  {isEventCreator && tournament && !tournament.isStarted && (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="Guest name"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleAddPlayer}
                        disabled={!newPlayerName.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow transition-colors flex items-center"
                      >
                        <UserPlusIcon className="h-5 w-5 mr-1" />
                        Add
                      </button>
                    </div>
                  )}
                </div>
                
                {tournament?.players?.filter(p => p.isGuest)?.length ? (
                  <ul className="space-y-3">
                    {tournament?.players
                      ?.filter(p => p.isGuest)
                      ?.map((player, index) => (
                        <li key={player.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                          <div className="flex items-center">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mr-3">
                              G{index + 1}
                            </div>
                            <div>
                              <span className="text-gray-900 dark:text-white font-medium">{player.name}</span>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                Registered: {format(new Date(player.registeredAt || Date.now()), 'M/d/yyyy, h:mm a')}
                              </div>
                            </div>
                          </div>
                          {isEventCreator && tournament && !tournament.isStarted && (
                            <button
                              onClick={() => handleRemovePlayer(player.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">No guest players yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show tournament view for registered players, event creators, or when tournament is active/completed
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {tournament.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Status: {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
          </p>
        </div>

        {/* Match Results Access for Registered Players */}
        {!isEventCreator && isUserRegistered && (tournament.status === 'active' || tournament.status === 'completed') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Tournament Actions</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Match Results</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                  Submit your match results, confirm opponent results, and track your tournament progress.
                </p>
                <button
                  onClick={() => navigate(`/tournament/swiss/${tournament.id}/results`)}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Submit & Manage Match Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rest of the tournament view code ... */}
      </div>
    </div>
  );
};

export default SwissTournament; 