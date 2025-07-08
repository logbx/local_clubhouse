import React from 'react';
import { UserPlusIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Tournament } from '../../services/tournament.service';

interface TournamentSetupTabProps {
  tournament: Tournament;
  onOpenRegistration: () => void;
  onCloseRegistration: () => void;
  onDeleteTournament: () => void;
  deleting: boolean;
  tournamentType: 'Swiss' | 'Single Elimination';
}

export const TournamentSetupTab: React.FC<TournamentSetupTabProps> = ({
  tournament,
  onOpenRegistration,
  onCloseRegistration,
  onDeleteTournament,
  deleting,
  tournamentType
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Tournament Setup</h2>
      
      {/* Registration Management */}
      {!tournament.isStarted && (
        <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Registration Management</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onOpenRegistration}
              className={`btn ${tournament.registrationOpen ? 'btn-success opacity-50 cursor-not-allowed' : 'btn-success'}`}
              disabled={tournament.isStarted || tournament.registrationOpen}
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              {tournament.registrationOpen ? 'Registration Open' : 'Open Registration'}
            </button>
            <button
              onClick={onCloseRegistration}
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
            onClick={onDeleteTournament}
            className="btn btn-danger"
            disabled={deleting}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Tournament
          </button>
        </div>
      </div>
    </div>
  );
};