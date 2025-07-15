import React from 'react';
import { TournamentPlayer } from '../services/tournament.service';
import { TrophyIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/outline';
import './TournamentPodium.css';

interface SwissTournamentStandingsProps {
  players: TournamentPlayer[];
  rounds: any[];
  isFinished: boolean;
}

const SwissTournamentStandings: React.FC<SwissTournamentStandingsProps> = ({ players, rounds, isFinished }) => {
  // Use backend-calculated points when available, fallback to client-side calculation
  const sortedPlayers = [...players]
    .map(player => {
      // Prefer backend-calculated points if available
      let actualPoints = player.points || 0;
      let actualWins = player.wins || 0;
      let buchholzScore = player.buchholzScore || 0;
      
      // Only calculate client-side if backend data is missing or zero and there are completed rounds
      if ((actualPoints === 0 && actualWins === 0) && rounds.some(r => r.isComplete)) {
        rounds.forEach(round => {
          if (round.isComplete) {
            // Check if player had a match
            const playerMatch = round.matches.find((match: any) => 
              match.player1.id === player.id || match.player2.id === player.id
            );
            
            if (playerMatch && playerMatch.status === 'completed') {
              if (playerMatch.isDraw || playerMatch.result === 'draw') {
                actualPoints += 0.5;
              } else if (playerMatch.winnerId === player.id) {
                actualPoints += 1;
                actualWins += 1;
              }
            }
            
            // Check if player had a bye
            const hadBye = round.byePlayers?.some((byePlayer: any) => byePlayer.id === player.id);
            if (hadBye) {
              actualPoints += 1;
            }
          }
        });
      }
      
      return {
        ...player,
        actualPoints,
        actualWins,
        buchholzScore
      };
    })
    .sort((a, b) => {
      // Primary sort by actual points
      if ((b.actualPoints || 0) !== (a.actualPoints || 0)) {
        return (b.actualPoints || 0) - (a.actualPoints || 0);
      }
      // Secondary sort by Buchholz score
      if (b.buchholzScore !== a.buchholzScore) {
        return b.buchholzScore - a.buchholzScore;
      }
      // Tertiary sort by actual wins
      if ((b.actualWins || 0) !== (a.actualWins || 0)) {
        return (b.actualWins || 0) - (a.actualWins || 0);
      }
      // Finally sort by name
      return (a.name || '').localeCompare(b.name || '');
    });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  const getRankClass = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black border-2 border-yellow-400 shadow-lg shadow-yellow-400/30';
      case 2:
        return 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-black border-2 border-gray-400 shadow-lg shadow-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white border-2 border-orange-400 shadow-lg shadow-orange-400/30';
      default:
        return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700';
    }
  };

  if (isFinished) {
    return (
      <div className="space-y-6">
        {/* Tournament Champions Header */}
        <div className="text-center py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4 gap-2 sm:gap-0">
            <TrophyIcon className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-500 sm:mr-3" />
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Tournament Champions
            </h2>
            <SparklesIcon className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-500 sm:ml-3" />
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">🏁 Tournament Complete - Final Results</p>
        </div>

        {/* Winners Podium - Wide & Clean */}
        <div className="tournament-podium">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-4 sm:p-8 shadow-xl border border-gray-700">
            <div className="podium-container">
              
              {/* 2nd Place - Silver (Left) */}
              {sortedPlayers[1] && (
                <div className="podium-placement second">
                  <div className="floating-avatar">
                    <div className="avatar-circle">
                      {sortedPlayers[1].name.charAt(0)}
                    </div>
                    <div className="player-name">{sortedPlayers[1].name}</div>
                  </div>
                  <div className="podium-step silver">
                    <div className="stat">{(sortedPlayers[1].actualPoints || 0).toFixed(1)} pts</div>
                    <div className="stat">{sortedPlayers[1].actualWins || 0} wins</div>
                    <div className="stat">{sortedPlayers[1].buchholzScore || 0} bh</div>
                  </div>
                </div>
              )}

              {/* 1st Place - Gold (Center, Tallest) */}
              {sortedPlayers[0] && (
                <div className="podium-placement first">
                  <div className="floating-avatar">
                    <div className="avatar-circle">
                      {sortedPlayers[0].name.charAt(0)}
                    </div>
                    <div className="player-name">{sortedPlayers[0].name}</div>
                  </div>
                  <div className="podium-step gold">
                    <div className="stat">{(sortedPlayers[0].actualPoints || 0).toFixed(1)} pts</div>
                    <div className="stat">{sortedPlayers[0].actualWins || 0} wins</div>
                    <div className="stat">{sortedPlayers[0].buchholzScore || 0} bh</div>
                  </div>
                </div>
              )}

              {/* 3rd Place - Bronze (Right) */}
              {sortedPlayers[2] && (
                <div className="podium-placement third">
                  <div className="floating-avatar">
                    <div className="avatar-circle">
                      {sortedPlayers[2].name.charAt(0)}
                    </div>
                    <div className="player-name">{sortedPlayers[2].name}</div>
                  </div>
                  <div className="podium-step bronze">
                    <div className="stat">{(sortedPlayers[2].actualPoints || 0).toFixed(1)} pts</div>
                    <div className="stat">{sortedPlayers[2].actualWins || 0} wins</div>
                    <div className="stat">{sortedPlayers[2].buchholzScore || 0} bh</div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Remaining Players Table */}
        {sortedPlayers.length > 3 && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            <div className="p-3 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Complete Final Standings
              </h3>
              
              {/* Mobile-friendly card layout for small screens */}
              <div className="block sm:hidden space-y-3">
                {sortedPlayers.map((player, index) => {
                  const rank = index + 1;
                  const isTopThree = rank <= 3;
                  return (
                    <div 
                      key={player.id}
                      className={`${
                        isTopThree 
                          ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-600'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      } rounded-lg p-3 border`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {getRankIcon(rank) && (
                            <span className="text-base mr-2">{getRankIcon(rank)}</span>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">#{rank}</span>
                        </div>
                        {rank === 1 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Champion
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white mb-2">
                        {player.name}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-white dark:bg-gray-600 rounded">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {(player.actualPoints || 0).toFixed(1)}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">Points</div>
                        </div>
                        <div className="text-center p-2 bg-white dark:bg-gray-600 rounded">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {player.actualWins || 0}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">Wins</div>
                        </div>
                        <div className="text-center p-2 bg-white dark:bg-gray-600 rounded">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {player.buchholzScore || 0}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">Buchholz</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Rank
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Player
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Points
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Wins
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Buchholz
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedPlayers.map((player, index) => {
                      const rank = index + 1;
                      const isTopThree = rank <= 3;
                      return (
                        <tr 
                          key={player.id} 
                          className={`${
                            isTopThree 
                              ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 font-semibold'
                              : index % 2 === 0 
                                ? 'bg-white dark:bg-gray-800' 
                                : 'bg-gray-50 dark:bg-gray-700'
                          } hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center">
                              {getRankIcon(rank) && (
                                <span className="text-lg mr-2">{getRankIcon(rank)}</span>
                              )}
                              {rank}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {player.name}
                            {rank === 1 && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                Champion
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                            {(player.actualPoints || 0).toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {player.actualWins || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {player.buchholzScore || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular standings for ongoing tournament
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
      <div className="p-3 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Current Standings
        </h2>
        
        {/* Mobile-friendly card layout for small screens */}
        <div className="block sm:hidden space-y-3">
          {sortedPlayers.map((player, index) => {
            const rank = index + 1;
            const isLeading = rank === 1;
            return (
              <div 
                key={player.id}
                className={`${
                  isLeading 
                    ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-600'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                } rounded-lg p-3 border`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">#{rank}</span>
                    {isLeading && (
                      <span className="ml-2 text-green-600 dark:text-green-400">👑</span>
                    )}
                  </div>
                  {isLeading && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Leading
                    </span>
                  )}
                </div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">
                  {player.name}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-white dark:bg-gray-600 rounded">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {(player.actualPoints || 0).toFixed(1)}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Points</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-600 rounded">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {player.actualWins || 0}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Wins</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-600 rounded">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {player.buchholzScore || 0}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Buchholz</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table view */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Player
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Points
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Wins
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Buchholz
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                const isLeading = rank === 1;
                return (
                  <tr 
                    key={player.id} 
                    className={`${
                      isLeading 
                        ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 font-semibold'
                        : index % 2 === 0 
                          ? 'bg-white dark:bg-gray-800' 
                          : 'bg-gray-50 dark:bg-gray-700'
                    } hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        {rank}
                        {isLeading && (
                          <span className="ml-2 text-green-600 dark:text-green-400">👑</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {player.name}
                      {isLeading && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Leading
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-semibold">
                      {(player.actualPoints || 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {player.actualWins || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {player.buchholzScore || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SwissTournamentStandings; 