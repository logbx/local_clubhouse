import React from 'react';
import { TrophyIcon, StarIcon } from '@heroicons/react/24/outline';
import { Tournament, TournamentPlayer } from '../../../services/tournament.service';

interface SwissStandingsProps {
  tournament: Tournament;
  standings?: TournamentPlayer[];
  loading?: boolean;
}

const SwissStandings: React.FC<SwissStandingsProps> = ({
  tournament,
  standings,
  loading = false
}) => {
  // Calculate standings if not provided
  const calculatedStandings = standings || [...tournament.players].sort((a, b) => {
    // Primary sort by points
    if ((b.points || 0) !== (a.points || 0)) {
      return (b.points || 0) - (a.points || 0);
    }
    // Secondary sort by Buchholz score
    if ((b.buchholzScore || 0) !== (a.buchholzScore || 0)) {
      return (b.buchholzScore || 0) - (a.buchholzScore || 0);
    }
    // Tertiary sort by wins
    if ((b.wins || 0) !== (a.wins || 0)) {
      return (b.wins || 0) - (a.wins || 0);
    }
    // Finally sort by name
    return (a.name || '').localeCompare(b.name || '');
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophyIcon className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <StarIcon className="h-5 w-5 text-gray-400" />;
      case 3:
        return <StarIcon className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 2:
        return 'bg-gray-50 dark:bg-gray-700/20 border-gray-200 dark:border-gray-600';
      case 3:
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="h-6 bg-gray-300 rounded w-32 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center p-4 border rounded-lg animate-pulse">
              <div className="w-8 h-8 bg-gray-300 rounded-full mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-24"></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                <div className="h-4 bg-gray-300 rounded w-12"></div>
                <div className="h-4 bg-gray-300 rounded w-12"></div>
                <div className="h-4 bg-gray-300 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Tournament Standings
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {tournament.isFinished ? 'Final Results' : 'Current Standings'}
        </span>
      </div>

      {/* Standings Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        <div className="col-span-1">Rank</div>
        <div className="col-span-5">Player</div>
        <div className="col-span-2 text-center">Points</div>
        <div className="col-span-2 text-center">Wins</div>
        <div className="col-span-2 text-center">Buchholz</div>
      </div>

      {/* Standings List */}
      <div className="space-y-2 mt-4">
        {calculatedStandings.map((player, index) => {
          const rank = index + 1;
          const isLeader = rank === 1;
          
          return (
            <div
              key={player.id}
              className={`grid grid-cols-12 gap-4 p-4 border rounded-lg transition-colors ${getRankColor(rank)}`}
            >
              {/* Rank */}
              <div className="col-span-1 flex items-center">
                <div className="flex items-center">
                  {getRankIcon(rank)}
                  <span className={`ml-2 font-semibold ${isLeader ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {rank}
                  </span>
                </div>
              </div>

              {/* Player Name */}
              <div className="col-span-5 flex items-center">
                <div>
                  <div className={`font-medium ${isLeader ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                    {player.name}
                  </div>
                  {player.isGuest && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                      Guest
                    </span>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className="col-span-2 text-center">
                <div className={`text-lg font-bold ${isLeader ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                  {(player.points || 0).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  pts
                </div>
              </div>

              {/* Wins */}
              <div className="col-span-2 text-center">
                <div className={`text-lg font-semibold ${isLeader ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {player.wins || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  wins
                </div>
              </div>

              {/* Buchholz Score */}
              <div className="col-span-2 text-center">
                <div className={`text-lg font-semibold ${isLeader ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {(player.buchholzScore || 0).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  bhz
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scoring Legend */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Scoring System
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div>• Win: 1 point</div>
          <div>• Draw: 0.5 points</div>
          <div>• Loss: 0 points</div>
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <strong>Tiebreakers:</strong> 1) Points 2) Buchholz Score (sum of opponents' scores) 3) Wins 4) Name
        </div>
      </div>
    </div>
  );
};

export default SwissStandings;