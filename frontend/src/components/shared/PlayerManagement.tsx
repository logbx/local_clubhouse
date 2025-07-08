import React, { useState } from 'react';
import { UserPlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Tournament } from '../../services/tournament.service';

interface PlayerManagementProps {
  tournament: Tournament;
  onAddGuest: (name: string) => void;
  onRemovePlayer: (playerId: string) => void;
  addingGuest: boolean;
}

export const PlayerManagement: React.FC<PlayerManagementProps> = ({
  tournament,
  onAddGuest,
  onRemovePlayer,
  addingGuest
}) => {
  const [guestName, setGuestName] = useState('');

  const handleAddGuest = () => {
    if (guestName.trim()) {
      onAddGuest(guestName.trim());
      setGuestName('');
    }
  };

  return (
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
              {tournament.players.filter(p => !p.isGuest).map((player) => (
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
                      onClick={() => onRemovePlayer(player.id)}
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
                      onClick={() => onRemovePlayer(player.id)}
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
  );
};