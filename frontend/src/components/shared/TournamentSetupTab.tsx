import React from 'react';
import { Tournament } from '../../services/tournament.service';

interface TournamentSetupTabProps {
  tournament: Tournament;
  onOpenRegistration: () => void;
  onCloseRegistration: () => void;
  tournamentType: 'Swiss' | 'Single Elimination';
}

export const TournamentSetupTab: React.FC<TournamentSetupTabProps> = ({
  tournament,
  onOpenRegistration,
  onCloseRegistration,
  tournamentType
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Tournament Setup</h2>
      
      {/* Registration Management */}
      {!tournament.isStarted && (
        <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Registration Management</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Registration:</span>
            <div className="relative flex bg-gray-200 dark:bg-gray-700 rounded-full p-1 w-48">
              {/* Sliding background */}
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-2px)] bg-white dark:bg-gray-600 rounded-full shadow-md transition-all duration-300 ease-in-out ${
                  tournament.registrationOpen ? 'left-1' : 'left-[calc(50%+1px)]'
                }`}
                style={{
                  background: tournament.registrationOpen 
                    ? 'linear-gradient(135deg, #10b981, #059669)' 
                    : 'linear-gradient(135deg, #ef4444, #dc2626)'
                }}
              />
              
              {/* Buttons */}
              <button
                onClick={onOpenRegistration}
                disabled={tournament.isStarted || tournament.registrationOpen}
                className={`relative z-10 flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out rounded-full ${
                  tournament.registrationOpen
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Open
              </button>
              <button
                onClick={onCloseRegistration}
                disabled={tournament.isStarted || !tournament.registrationOpen}
                className={`relative z-10 flex-1 px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out rounded-full ${
                  !tournament.registrationOpen
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Closed
              </button>
            </div>
          </div>
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
            <p className="mt-1 text-gray-900 dark:text-white">{tournamentType} Tournament</p>
          </div>
          {tournamentType === 'Swiss' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Rounds</label>
              <p className="mt-1 text-gray-900 dark:text-white">{tournament.numRounds || 3}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Players</label>
            <p className="mt-1 text-gray-900 dark:text-white">{tournament.maxPlayers}</p>
          </div>
        </div>
      </div>

    </div>
  );
};