import React from 'react';
import { 
  PlayIcon, 
  UserPlusIcon, 
  CheckIcon, 
  PauseIcon,
  TrophyIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { Tournament, TournamentType } from '../../../services/tournament.service';

interface TournamentControlsProps {
  tournament?: Tournament;
  isEventCreator: boolean;
  isUserRegistered: boolean;
  canRegister: boolean;
  onStartTournament?: () => Promise<void>;
  onRegisterForTournament?: () => Promise<void>;
  onUnregisterFromTournament?: () => Promise<void>;
  onOpenRegistration?: () => Promise<void>;
  onCloseRegistration?: () => Promise<void>;
  loading?: boolean;
}

const TournamentControls: React.FC<TournamentControlsProps> = ({
  tournament,
  isEventCreator,
  isUserRegistered,
  canRegister,
  onStartTournament,
  onRegisterForTournament,
  onUnregisterFromTournament,
  onOpenRegistration,
  onCloseRegistration,
  loading = false
}) => {
  if (loading || !tournament) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="h-10 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    );
  }

  const canStartTournament = isEventCreator && 
    !tournament.isStarted && 
    !tournament.isFinished && 
    tournament.players.length >= 2;

  const minPlayersForType = tournament.type === TournamentType.SWISS ? 4 : 2;
  const hasEnoughPlayers = tournament.players.length >= minPlayersForType;

  // Event creator controls
  if (isEventCreator) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Tournament Management
        </h2>
        
        <div className="space-y-4">
          {/* Tournament Start Control */}
          {!tournament.isStarted && !tournament.isFinished && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                Start Tournament
              </h3>
              
              {!hasEnoughPlayers && (
                <div className="flex items-center text-amber-700 dark:text-amber-400 mb-3">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm">
                    Need at least {minPlayersForType} players to start a {tournament.type.replace('_', ' ')} tournament
                  </span>
                </div>
              )}
              
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                {hasEnoughPlayers 
                  ? `Ready to start with ${tournament.players.length} players`
                  : `Currently ${tournament.players.length} of ${minPlayersForType} minimum players`
                }
              </p>
              
              <button
                onClick={onStartTournament}
                disabled={!canStartTournament}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center transition-colors"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Start Tournament
              </button>
            </div>
          )}

          {/* Registration Controls */}
          {!tournament.isStarted && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Registration Control
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Registration is currently {tournament.registrationOpen ? 'open' : 'closed'}
                </span>
                
                {tournament.registrationOpen ? (
                  <button
                    onClick={onCloseRegistration}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center"
                  >
                    <PauseIcon className="h-4 w-4 mr-1" />
                    Close Registration
                  </button>
                ) : (
                  <button
                    onClick={onOpenRegistration}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <PlayIcon className="h-4 w-4 mr-1" />
                    Open Registration
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tournament Status */}
          {(tournament.isStarted || tournament.isFinished) && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center">
                {tournament.isFinished ? (
                  <>
                    <TrophyIcon className="h-6 w-6 text-yellow-500 mr-3" />
                    <div>
                      <h3 className="font-medium text-green-900 dark:text-green-300">
                        Tournament Complete!
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        View final results and standings
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-6 w-6 text-green-500 mr-3" />
                    <div>
                      <h3 className="font-medium text-green-900 dark:text-green-300">
                        Tournament In Progress
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Monitor matches and manage results
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Player controls
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Tournament Participation
      </h2>
      
      <div className="space-y-4">
        {isUserRegistered ? (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckIcon className="h-6 w-6 text-green-500 mr-3" />
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-300">
                    You're Registered!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {tournament.isStarted 
                      ? 'Tournament is underway - check your matches'
                      : 'Waiting for tournament to start'
                    }
                  </p>
                </div>
              </div>
              
              {!tournament.isStarted && onUnregisterFromTournament && (
                <button
                  onClick={onUnregisterFromTournament}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                >
                  Unregister
                </button>
              )}
            </div>
          </div>
        ) : canRegister ? (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              Join the Tournament
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
              Register now to participate in this {tournament.type.replace('_', ' ')} tournament!
            </p>
            <button
              onClick={onRegisterForTournament}
              className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center justify-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Register Now
            </button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Registration Unavailable
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tournament.isStarted 
                ? 'Tournament has already started'
                : tournament.isFinished
                ? 'Tournament has finished'
                : !tournament.registrationOpen
                ? 'Registration is currently closed'
                : tournament.players.length >= tournament.maxPlayers
                ? 'Tournament is full'
                : 'Unable to register at this time'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentControls;