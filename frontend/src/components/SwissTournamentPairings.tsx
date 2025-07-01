import React from 'react';
import { TournamentMatch, TournamentRound } from '../services/tournament.service';

interface SwissTournamentPairingsProps {
  round: TournamentRound;
  currentRound: number;
  totalRounds: number;
  onReportResult: (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => Promise<void>;
  isOrganizer: boolean;
  allowDraws?: boolean;
}

export const SwissTournamentPairings: React.FC<SwissTournamentPairingsProps> = ({
  round,
  currentRound,
  totalRounds,
  onReportResult,
  isOrganizer,
  allowDraws = false
}) => {
  const renderMatchResult = (match: TournamentMatch) => {
    if (match.status === 'completed') {
      return (
        <div className="text-sm font-medium">
          {match.isDraw ? (
            <span className="text-blue-600 dark:text-blue-400">Draw (0.5 points each)</span>
          ) : (
            <>
              Winner: <span className="text-green-600 dark:text-green-400">
                {match.winnerId === match.player1.id ? match.player1.name : match.player2.name}
              </span>
            </>
          )}
        </div>
      );
    }

    if (match.status === 'submitted') {
      return (
        <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
          Result submitted - awaiting confirmation
        </div>
      );
    }

    if (match.status === 'disputed') {
      return (
        <div className="text-sm font-medium text-red-600 dark:text-red-400">
          Result disputed - awaiting resolution
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Round {round.roundNumber} of {totalRounds}
        </h3>
        {round.roundNumber === currentRound && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Current Round
          </span>
        )}
      </div>

      <div className="grid gap-4">
        {round.matches.map((match) => (
          <div
            key={match.matchId}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="font-medium">{match.player1.name}</div>
                {match.player1.isGuest && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 mt-1">
                    Guest
                  </span>
                )}
              </div>
              
              <div className="px-4">
                <div className="text-lg font-bold text-gray-400">VS</div>
              </div>
              
              <div className="flex-1 text-center">
                <div className="font-medium">{match.player2.name}</div>
                {match.player2.isGuest && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 mt-1">
                    Guest
                  </span>
                )}
              </div>
            </div>

            {/* Match Result or Actions */}
            <div className="mt-4">
              {renderMatchResult(match)}
              
              {match.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => onReportResult(match, 'win')}
                    className="flex-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {isOrganizer ? `${match.player1.name} Won` : 'I Won'}
                  </button>
                  {allowDraws && (
                    <button
                      onClick={() => onReportResult(match, 'draw')}
                      className="flex-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Draw
                    </button>
                  )}
                  <button
                    onClick={() => onReportResult(match, 'loss')}
                    className="flex-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    {isOrganizer ? `${match.player2.name} Won` : 'I Lost'}
                  </button>
                </div>
              )}

              {/* Organizer Override Section */}
              {isOrganizer && match.status !== 'pending' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tournament Organizer Controls
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onReportResult(match, 'win')}
                      className="flex-1 px-2 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                    >
                      Override: {match.player1.name} Won
                    </button>
                    <button
                      onClick={() => onReportResult(match, 'draw')}
                      className="flex-1 px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                    >
                      Override: Draw
                    </button>
                    <button
                      onClick={() => onReportResult(match, 'loss')}
                      className="flex-1 px-2 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      Override: {match.player2.name} Won
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SwissTournamentPairings; 