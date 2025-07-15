import React, { useState } from 'react';
import { TournamentType } from '../services/tournament.service';
import { tournamentService } from '../services/tournament.service';
import { EventFeatures } from '../types/event';
import { log, LogCategory } from '../utils/logger';

interface TournamentCreationFormProps {
  eventId: string;
  eventFeature: EventFeatures;
  onTournamentCreated: (tournament: any) => void;
  defaultName?: string;
}

const TournamentCreationForm: React.FC<TournamentCreationFormProps> = ({ eventId, eventFeature, onTournamentCreated, defaultName = '' }) => {
  const [name, setName] = useState(defaultName);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [numRounds, setNumRounds] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed' | 'authenticated' | 'auth-failed'>('checking');

  // Check authentication and backend connection on component mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check if we have a token
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setConnectionStatus('auth-failed');
          setError('You must be logged in to create a tournament. Please login first.');
          return;
        }

        // Test backend connection with auth verification  
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://localclubhouse.com';
        const response = await fetch(`${apiBaseUrl}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setConnectionStatus('authenticated');
          setError(null);
        } else if (response.status === 401) {
          setConnectionStatus('auth-failed');
          setError('Your session has expired. Please login again.');
        } else {
          setConnectionStatus('failed');
          setError('Unable to connect to server. Please check if the backend is running.');
        }
      } catch (err) {
        setConnectionStatus('failed');
        setError('Backend connection failed. Please ensure the backend server is running.');
      }
    };

    checkConnection();
  }, []);

  // Log that the tournament creation form is being displayed
  console.log('🎯 TournamentCreationForm displayed!', {
    eventId,
    eventFeature,
    defaultName,
    maxPlayers,
    connectionStatus
  });
  console.log('✅ Tournament Creation Flow: Step 5 - TournamentCreationForm is rendered for event creator');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🎯 Tournament Creation Form submitted!', {
      eventId,
      name: name.trim(),
      maxPlayers,
      eventFeature,
      numRounds,
      connectionStatus
    });
    console.log('✅ Tournament Creation Flow: Step 7 - Form submission starting...');
    
    if (connectionStatus !== 'authenticated') {
      setError('Cannot create tournament: Authentication failed. Please login and try again.');
      return;
    }
    
    if (!name.trim()) {
      setError('Tournament name is required');
      return;
    }

    const type = eventFeature === EventFeatures.SWISS_TOURNAMENT 
      ? TournamentType.SWISS 
      : TournamentType.SINGLE_ELIMINATION;

    if (type === TournamentType.SWISS && (numRounds < 1 || numRounds > 10)) {
      setError('Number of rounds must be between 1 and 10');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      
      console.log('📡 Tournament Creation Flow: Step 8 - Making API call to /api/tournaments/create');
      log.info(LogCategory.TOURNAMENT, 'Creating tournament', {
        eventId,
        name: name.trim(),
        maxPlayers,
        type,
        numRounds: type === TournamentType.SWISS ? numRounds : undefined
      });

      // Add authentication debug
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('You must be logged in to create a tournament.');
        return;
      }

      const tournament = await tournamentService.createTournament(
        eventId,
        name.trim(),
        maxPlayers,
        type,
        type === TournamentType.SWISS ? numRounds : undefined // Only send numRounds for Swiss tournaments
      );

      console.log('🎉 Tournament Created Successfully!', tournament);
      console.log('✅ Tournament Creation Flow: Step 9 - API call successful, calling onTournamentCreated callback');
      log.info(LogCategory.TOURNAMENT, 'Tournament created successfully');
      
      console.log('🚀 Tournament Creation Flow: Step 10 - Navigating to tournament management page...');
      onTournamentCreated(tournament);
    } catch (err: any) {
      console.error('❌ Tournament creation failed:', err);
      
      // Enhanced error handling
      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
        setConnectionStatus('auth-failed');
      } else if (err.response?.status === 400) {
        const errorMessage = err.response?.data?.message || 'Invalid tournament data. Please check your inputs.';
        setError(errorMessage);
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create tournaments for this event.');
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Please ensure the backend is running.');
        setConnectionStatus('failed');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to create tournament. Please try again.');
      }
      
      log.error(LogCategory.TOURNAMENT, 'Tournament creation failed', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Connection status indicator
  const getConnectionStatusBanner = () => {
    switch (connectionStatus) {
      case 'checking':
        return (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">⏳ Checking server connection...</p>
          </div>
        );
      case 'connected':
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
            <p className="text-blue-700 dark:text-blue-300 text-sm">🔗 Connected to server - Please login to create tournaments</p>
          </div>
        );
      case 'authenticated':
        return (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
            <p className="text-green-700 dark:text-green-300 text-sm">✅ Connected and authenticated - Ready to create tournament!</p>
          </div>
        );
      case 'auth-failed':
        return (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
            <p className="text-red-700 dark:text-red-300 text-sm">🔐 Authentication required - Please login to create tournaments</p>
          </div>
        );
      case 'failed':
        return (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
            <p className="text-red-700 dark:text-red-300 text-sm">❌ Server connection failed - Please ensure backend is running</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-8 transition-colors duration-200">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Tournament</h2>
        
        {/* Connection Status Banner */}
        {getConnectionStatusBanner()}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tournament Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tournament Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter tournament name"
              required
              disabled={isCreating || connectionStatus !== 'authenticated'}
            />
          </div>

          {/* Maximum Players */}
          <div>
            <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum Players
            </label>
            <select
              id="maxPlayers"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isCreating || connectionStatus !== 'authenticated'}
            >
              <option value={4}>4 players</option>
              <option value={8}>8 players</option>
              <option value={16}>16 players</option>
              <option value={32}>32 players</option>
              <option value={64}>64 players</option>
            </select>
          </div>

          {/* Number of Rounds (Swiss only) */}
          {eventFeature === EventFeatures.SWISS_TOURNAMENT && (
            <div>
              <label htmlFor="numRounds" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Rounds
              </label>
              <select
                id="numRounds"
                value={numRounds}
                onChange={(e) => setNumRounds(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={isCreating || connectionStatus !== 'authenticated'}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rounds) => (
                  <option key={rounds} value={rounds}>
                    {rounds} round{rounds > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCreating || connectionStatus !== 'authenticated'}
            className="w-full flex justify-center items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow transition-colors duration-200"
          >
            {isCreating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Tournament...
              </span>
            ) : connectionStatus !== 'authenticated' ? (
              'Please Login to Create Tournament'
            ) : (
              'Create Tournament'
            )}
          </button>
        </form>

        {/* Connection Help */}
        {connectionStatus === 'failed' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Backend Connection Help</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>1. Ensure the backend server is running</p>
              <p>2. Check your internet connection</p>
              <p>3. Verify the backend health at: <a href={`${import.meta.env.VITE_API_URL || 'https://localclubhouse.com'}/api/health/status`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">API Health Check</a></p>
            </div>
          </div>
        )}

        {connectionStatus === 'auth-failed' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Authentication Required</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You need to be logged in to create tournaments. Please <a href="/login" className="text-blue-600 hover:underline">login</a> and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentCreationForm; 