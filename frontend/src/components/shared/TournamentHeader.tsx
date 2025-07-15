import React from 'react';
import { CogIcon, PlayIcon } from '@heroicons/react/24/outline';
import { Tournament } from '../../services/tournament.service';

interface TournamentHeaderProps {
  tournament: Tournament;
  tournamentId: string;
  onStartTournament?: () => void;
  canStartTournament: boolean;
  tournamentType: 'Swiss' | 'Single Elimination';
}

export const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  tournamentId,
  onStartTournament,
  canStartTournament,
  tournamentType
}) => {
  // Determine tournament completion status
  const determineTournamentCompletion = () => {
    if (tournament.isFinished) {
      return true;
    }
    
    // For single elimination, check if final match is completed
    if (tournamentType === 'Single Elimination') {
      const finalRound = tournament.rounds?.find(round => 
        round.roundName?.toLowerCase().includes('final') || 
        round.roundNumber === tournament.rounds.length
      );
      
      if (finalRound) {
        const finalMatch = finalRound.matches?.find(match => 
          match.status === 'completed' && match.winnerId
        );
        
        if (finalMatch) {
          return true;
        }
      }
    }
    
    return false;
  };

  const isTournamentCompleted = determineTournamentCompletion();
  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200 mb-8 relative z-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center">
          <CogIcon className="h-8 w-8 text-blue-500 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{tournament.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">{tournamentType} Tournament Management</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {canStartTournament && onStartTournament && (
            <button
              onClick={onStartTournament}
              className="btn btn-success rounded-full px-6 border-2 border-green-600 dark:border-green-500 hover:border-green-700 dark:hover:border-green-400"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Start Tournament
            </button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 relative z-1">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Players</h3>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {tournament.players.length} / {tournament.maxPlayers}
          </p>
        </div>
        
        <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 relative z-1">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Status</h3>
          <p className={`text-lg font-bold ${
            isTournamentCompleted 
              ? 'text-gray-600 dark:text-gray-400' 
              : tournament.isStarted 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            {isTournamentCompleted ? 'Finished' : tournament.isStarted ? 'In Progress' : 'Setup'}
          </p>
        </div>
        
        <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 relative z-1">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">
            {tournamentType === 'Swiss' ? 'Current Round' : 'Round'}
          </h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {tournamentType === 'Swiss' 
              ? `${tournament.currentRound || 0} / ${tournament.numRounds || 3}`
              : `${tournament.rounds.length}`
            }
          </p>
        </div>
        
        <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg p-4 relative z-1">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Matches</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {tournament.rounds.reduce((total, round) => total + round.matches.length, 0)}
          </p>
        </div>
      </div>
    </div>
  );
};