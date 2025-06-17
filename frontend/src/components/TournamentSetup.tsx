import React from 'react';
import { Tournament } from '../services/tournament.service';

interface TournamentSetupProps {
  tournament: Tournament;
}

const TournamentSetup: React.FC<TournamentSetupProps> = ({ tournament }) => {
  return (
    <div className="tournament-setup max-w-4xl mx-auto">
      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200">
        {/* Tournament Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{tournament.name}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Max Players: {tournament.maxPlayers}</span>
            <span>Current Players: {tournament.players.length}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              tournament.isStarted 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                : tournament.registrationOpen
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}>
              {tournament.isStarted 
                ? 'Started' 
                : tournament.registrationOpen 
                  ? 'Registration Open' 
                  : 'Registration Closed'
              }
            </span>
          </div>
        </div>

        {/* Tournament Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Tournament Type</h3>
            <p className="text-lg font-bold text-primary-600 dark:text-primary-400">Single Elimination</p>
          </div>
          
          <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Registration Status</h3>
            <p className={`text-lg font-bold ${
              tournament.isStarted 
                ? 'text-gray-600 dark:text-gray-400' 
                : tournament.registrationOpen
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
            }`}>
              {tournament.isStarted 
                ? 'Tournament Started' 
                : tournament.registrationOpen 
                  ? 'Open' 
                  : 'Closed'
              }
            </p>
          </div>
          
          <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Progress</h3>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {tournament.players.length}/{tournament.maxPlayers} Players
            </p>
          </div>
        </div>

        {/* Players List */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Registered Players ({tournament.players.length})
          </h2>
          
          {tournament.players.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No players registered yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Players will appear here as they register for the tournament
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournament.players.map((player, index) => (
                <div key={player.id} className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{player.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {player.isGuest ? 'Guest Player' : 'Registered User'}
                    </div>
                  </div>
                  
                  <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tournament Rules */}
        <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-300">Tournament Rules</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Single elimination format - lose once and you're out
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Players can report their own match results
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Results must be confirmed by opponent or organizer
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Tournament organizer can override any result
            </li>
            <li className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Bracket seeding is randomized for fairness
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TournamentSetup; 