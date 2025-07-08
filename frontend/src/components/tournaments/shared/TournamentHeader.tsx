import React from 'react';
import { TrophyIcon } from '@heroicons/react/24/outline';
import { Tournament, TournamentType } from '../../../services/tournament.service';

interface TournamentHeaderProps {
  tournament?: Tournament;
  eventTitle: string;
  loading?: boolean;
}

const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  eventTitle,
  loading = false
}) => {
  const getTournamentTypeDisplay = (type: TournamentType) => {
    switch (type) {
      case TournamentType.SWISS:
        return 'Swiss Tournament';
      case TournamentType.SINGLE_ELIMINATION:
        return 'Single Elimination';
      default:
        return 'Tournament';
    }
  };

  const getStatusDisplay = (tournament: Tournament) => {
    if (tournament.isFinished) return 'Completed';
    if (tournament.isStarted) return 'In Progress';
    if (tournament.registrationOpen) return 'Registration Open';
    return 'Registration Closed';
  };

  const getStatusColor = (tournament: Tournament) => {
    if (tournament.isFinished) return 'text-gray-500';
    if (tournament.isStarted) return 'text-yellow-600';
    if (tournament.registrationOpen) return 'text-green-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="text-center mb-8 animate-pulse">
        <div className="h-16 w-16 bg-gray-300 rounded-full mx-auto mb-4"></div>
        <div className="h-8 bg-gray-300 rounded w-64 mx-auto mb-2"></div>
        <div className="h-6 bg-gray-300 rounded w-48 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="text-center mb-8">
      <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {tournament ? tournament.name : `Tournament for "${eventTitle}"`}
      </h1>
      
      <div className="flex justify-center items-center space-x-4 text-gray-600 dark:text-gray-400">
        {tournament && (
          <>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {getTournamentTypeDisplay(tournament.type)}
            </span>
            <span className="text-gray-400">•</span>
            <span className={`font-medium ${getStatusColor(tournament)}`}>
              {getStatusDisplay(tournament)}
            </span>
            <span className="text-gray-400">•</span>
            <span>
              {tournament.players.length} / {tournament.maxPlayers} Players
            </span>
          </>
        )}
      </div>

      {tournament?.isStarted && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {tournament.type === TournamentType.SWISS && tournament.currentRound && (
            <p>Round {tournament.currentRound} of {tournament.numRounds}</p>
          )}
          {tournament.type === TournamentType.SINGLE_ELIMINATION && (
            <p>Round {tournament.rounds.findIndex(r => !r.isComplete) + 1 || tournament.rounds.length} of {tournament.rounds.length}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentHeader;