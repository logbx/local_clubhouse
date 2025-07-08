import React, { useState } from 'react';
import { XMarkIcon, UserPlusIcon, UserIcon } from '@heroicons/react/24/outline';
import { Tournament, TournamentPlayer } from '../../../services/tournament.service';
import { format } from 'date-fns';

interface PlayerListProps {
  tournament?: Tournament;
  isEventCreator: boolean;
  currentUserId?: string;
  onAddGuestPlayer?: (name: string) => Promise<void>;
  onRemovePlayer?: (playerId: string) => Promise<void>;
  loading?: boolean;
}

const PlayerList: React.FC<PlayerListProps> = ({
  tournament,
  isEventCreator,
  currentUserId,
  onAddGuestPlayer,
  onRemovePlayer,
  loading = false
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !onAddGuestPlayer) return;
    
    setAddingPlayer(true);
    try {
      await onAddGuestPlayer(newPlayerName.trim());
      setNewPlayerName('');
    } catch (error) {
      console.error('Failed to add player:', error);
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!onRemovePlayer) return;
    
    try {
      await onRemovePlayer(playerId);
    } catch (error) {
      console.error('Failed to remove player:', error);
    }
  };

  const registeredPlayers = tournament?.players?.filter(p => !p.isGuest) || [];
  const guestPlayers = tournament?.players?.filter(p => p.isGuest) || [];

  if (loading) {
    return (
      <div className="mt-8">
        <div className="h-6 bg-gray-300 rounded w-48 mb-4 animate-pulse"></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-300 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Players ({tournament?.players?.length || 0})
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Updated {new Date().toLocaleTimeString()}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
        {/* Registered Players Section */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
            Registered Players ({registeredPlayers.length})
          </h3>
          
          {registeredPlayers.length > 0 ? (
            <ul className="space-y-3">
              {registeredPlayers.map((player, index) => (
                <PlayerItem
                  key={player.id}
                  player={player}
                  index={index}
                  currentUserId={currentUserId}
                  isEventCreator={isEventCreator}
                  canRemove={isEventCreator && tournament && !tournament.isStarted}
                  onRemove={() => handleRemovePlayer(player.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              No registered players yet
            </p>
          )}
        </div>

        {/* Guest Players Section */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-green-500" />
              Guest Players ({guestPlayers.length})
            </h3>
            
            {isEventCreator && tournament && !tournament.isStarted && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Guest name"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                  disabled={addingPlayer}
                />
                <button
                  onClick={handleAddPlayer}
                  disabled={!newPlayerName.trim() || addingPlayer}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg shadow transition-colors flex items-center text-sm"
                >
                  <UserPlusIcon className="h-4 w-4 mr-1" />
                  {addingPlayer ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
          </div>
          
          {guestPlayers.length > 0 ? (
            <ul className="space-y-3">
              {guestPlayers.map((player, index) => (
                <PlayerItem
                  key={player.id}
                  player={player}
                  index={index}
                  currentUserId={currentUserId}
                  isEventCreator={isEventCreator}
                  canRemove={isEventCreator && tournament && !tournament.isStarted}
                  onRemove={() => handleRemovePlayer(player.id)}
                  isGuest={true}
                />
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-4">
              No guest players yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface PlayerItemProps {
  player: TournamentPlayer;
  index: number;
  currentUserId?: string;
  isEventCreator: boolean;
  canRemove: boolean;
  onRemove: () => void;
  isGuest?: boolean;
}

const PlayerItem: React.FC<PlayerItemProps> = ({
  player,
  index,
  currentUserId,
  isEventCreator,
  canRemove,
  onRemove,
  isGuest = false
}) => {
  const isCurrentUser = player.userId === currentUserId;
  
  return (
    <li className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-medium ${
          isGuest 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
        }`}>
          {isGuest ? `G${index + 1}` : index + 1}
        </div>
        
        <div>
          <div className="flex items-center">
            <span className="text-gray-900 dark:text-white font-medium">
              {player.name}
            </span>
            {isCurrentUser && (
              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                You
              </span>
            )}
            {isGuest && (
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                Guest
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Registered: {format(new Date(player.registeredAt || Date.now()), 'M/d/yyyy, h:mm a')}
          </span>
        </div>
      </div>
      
      {canRemove && (
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded transition-colors"
          title="Remove player"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </li>
  );
};

export default PlayerList;