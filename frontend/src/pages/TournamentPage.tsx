import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tournamentService, Tournament, TournamentType } from '../services/tournament.service';
import { webSocketService } from '../services/websocket.service';
import { TrophyIcon, UserPlusIcon, CalendarIcon, UserGroupIcon, PlayIcon } from '@heroicons/react/24/outline';
import TournamentBracket from '../components/TournamentBracket';
import SwissTournamentPairings from '../components/SwissTournamentPairings';
import SwissTournamentStandings from '../components/SwissTournamentStandings';
import { format } from 'date-fns';

const TournamentPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchTournament = async () => {
      if (!tournamentId) return;
      
      try {
        const data = await tournamentService.getTournament(tournamentId);
        setTournament(data);
      } catch (err) {
        console.error('Failed to fetch tournament:', err);
        setError('Failed to load tournament');
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [tournamentId]);

  // WebSocket handling for real-time updates
  useEffect(() => {
    if (!tournament?.eventId) return;

    // Join the event room to receive tournament updates
    webSocketService.joinEventChat(tournament.eventId);

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 Tournament WebSocket update received:', data);
      
      if (data.type === 'registration-opened' || data.type === 'registration-closed' || 
          data.type === 'player-registered' || data.type === 'tournament-started') {
        // Refresh tournament data when registration status changes
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

    // Subscribe to WebSocket tournament updates
    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    return () => {
      webSocketService.removeTournamentListeners();
    };
  }, [tournament?.eventId, tournamentId]);

  const handleRegister = async () => {
    if (!tournamentId || !user) return;

    setRegistering(true);
    try {
      console.log('🎯 Starting registration for user:', user.id, 'tournament:', tournamentId);
      const updatedTournament = await tournamentService.registerForTournament(tournamentId);
      console.log('✅ Registration successful, updated tournament:', updatedTournament);
      setTournament(updatedTournament);
      
      // Show success message
      alert('Successfully registered for the tournament!');
    } catch (err: any) {
      console.error('❌ Failed to register for tournament:', err);
      
      // Show specific error message if available
      const errorMessage = err.response?.data?.message || err.message || 'Failed to register for tournament. Please try again.';
      alert(errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  const isUserRegistered = tournament?.players.some(player => 
    player.userId === user?.id || player.id === user?.id
  );
  const isOrganizer = tournament?.organizerId === user?.id;
  const canRegister = user && !isUserRegistered && !tournament?.isStarted && !tournament?.isFinished && tournament?.registrationOpen !== false;

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
    <div className="max-w-6xl mx-auto p-4">
      {/* Tournament Header */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <TrophyIcon className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{tournament.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {tournament.type === TournamentType.SWISS ? 'Swiss Tournament' : 'Single Elimination Tournament'}
              </p>
            </div>
          </div>
          
          {isOrganizer && (
            <button
              onClick={() => navigate(`/tournament/${tournamentId}/manage`)}
              className="btn btn-primary"
            >
              Manage Tournament
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-center">
            <UserGroupIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Players</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {tournament.players.length} / {tournament.maxPlayers}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <PlayIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Status</h3>
              <p className={`font-medium ${
                tournament.isFinished 
                  ? 'text-gray-600 dark:text-gray-400' 
                  : tournament.isStarted 
                    ? 'text-green-600 dark:text-green-400' 
                    : tournament.registrationOpen === false
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {tournament.isFinished 
                  ? 'Finished' 
                  : tournament.isStarted 
                    ? 'In Progress' 
                    : tournament.registrationOpen === false
                      ? 'Registration Closed'
                      : 'Registration Open'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Created</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {format(new Date(tournament.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Registration Section */}
        {!user ? (
          <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Join the Tournament</h3>
            <p className="text-blue-700 dark:text-blue-400 mb-4">
              Please log in to register for this tournament.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="btn btn-primary"
            >
              Login to Register
            </button>
          </div>
        ) : canRegister ? (
          <div className="bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-2">Join the Tournament</h3>
            <p className="text-green-700 dark:text-green-400 mb-4">
              Registration is open! Join now to compete.
            </p>
            <button 
              onClick={handleRegister}
              disabled={registering}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center"
            >
              {registering ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </span>
              ) : (
                <>
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Join Tournament
                </>
              )}
            </button>
          </div>
        ) : isUserRegistered ? (
          <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">You're Registered!</h3>
            <p className="text-blue-700 dark:text-blue-400">
              You're all set for this tournament. Good luck!
            </p>
          </div>
        ) : tournament.isStarted || tournament.isFinished ? (
          <div className="bg-gray-50/80 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-2">Registration Closed</h3>
            <p className="text-gray-700 dark:text-gray-400">
              This tournament has already started. Registration is no longer available.
            </p>
          </div>
        ) : tournament.registrationOpen === false ? (
          <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">Registration Closed</h3>
            <p className="text-red-700 dark:text-red-400">
              Registration for this tournament is currently closed. Please check back later.
            </p>
          </div>
        ) : null}
      </div>

      {/* Players List */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Registered Players</h2>
        
        {tournament.players.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No players registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {tournament.players.map((player, index) => (
              <div 
                key={player.id}
                className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-3 flex items-center"
              >
                <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {player.isGuest ? 'Guest' : 'User'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tournament Display */}
      {tournament.isStarted && (
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200">
          {tournament.type === TournamentType.SWISS ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Current Standings</h2>
                <SwissTournamentStandings tournament={tournament} />
              </div>
              
              {tournament.rounds && tournament.rounds.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                    Round {tournament.currentRound || tournament.rounds.length} Matches
                  </h2>
                  {(() => {
                    const currentRoundNumber = tournament.currentRound || tournament.rounds.length;
                    const currentRound = tournament.rounds.find(r => r.roundNumber === currentRoundNumber);
                    
                    if (!currentRound) {
                      return <p className="text-gray-600 dark:text-gray-400">No matches found for current round.</p>;
                    }
                    
                    return (
                      <SwissTournamentPairings
                        round={currentRound}
                        currentRound={currentRoundNumber}
                        totalRounds={tournament.numRounds || 3}
                        onReportResult={() => {}} // Public view - no result reporting
                        isOrganizer={false}
                        allowDraws={true}
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Tournament Bracket</h2>
              <TournamentBracket tournament={tournament} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentPage; 