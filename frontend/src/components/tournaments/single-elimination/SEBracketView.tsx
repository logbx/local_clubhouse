import React from 'react';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Tournament, TournamentRound, TournamentMatch } from '../../../services/tournament.service';

interface SEBracketViewProps {
  tournament: Tournament;
  currentUserId?: string;
  isEventCreator: boolean;
  onSubmitResult?: (matchId: string, winnerId: string) => Promise<void>;
  onConfirmResult?: (matchId: string) => Promise<void>;
  onDisputeResult?: (matchId: string, reason: string) => Promise<void>;
}

const SEBracketView: React.FC<SEBracketViewProps> = ({
  tournament,
  currentUserId,
  isEventCreator,
  onSubmitResult,
  onConfirmResult,
  onDisputeResult
}) => {
  const getRoundName = (roundNumber: number, totalRounds: number) => {
    const roundsFromEnd = totalRounds - roundNumber + 1;
    
    switch (roundsFromEnd) {
      case 1:
        return 'Finals';
      case 2:
        return 'Semi-Finals';
      case 3:
        return 'Quarter-Finals';
      default:
        return `Round ${roundNumber}`;
    }
  };

  const getMatchStatusIcon = (match: TournamentMatch) => {
    switch (match.status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'submitted':
        return <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" />;
      case 'disputed':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Tournament Bracket
      </h2>

      <div className="space-y-8">
        {tournament.rounds.map((round) => (
          <div key={round.roundNumber} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {getRoundName(round.roundNumber, tournament.rounds.length)}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {round.matches.filter(m => m.status === 'completed').length} / {round.matches.length} complete
              </span>
            </div>

            {/* Bye Players */}
            {round.byePlayers && round.byePlayers.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Automatic Advancement
                </div>
                <div className="flex flex-wrap gap-2">
                  {round.byePlayers.map(player => (
                    <span 
                      key={player.id}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-sm"
                    >
                      {player.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Matches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {round.matches.map((match, index) => (
                <SEMatchCard
                  key={match.matchId}
                  match={match}
                  matchNumber={index + 1}
                  roundName={getRoundName(round.roundNumber, tournament.rounds.length)}
                  currentUserId={currentUserId}
                  isEventCreator={isEventCreator}
                  onSubmitResult={onSubmitResult}
                  onConfirmResult={onConfirmResult}
                  onDisputeResult={onDisputeResult}
                  getStatusIcon={getMatchStatusIcon}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tournament Complete */}
      {tournament.isFinished && tournament.winnerId && (
        <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <div className="text-center">
            <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-300 mb-2">
              🏆 Tournament Champion! 🏆
            </h3>
            <p className="text-lg text-yellow-700 dark:text-yellow-400">
              {tournament.players.find(p => p.id === tournament.winnerId)?.name || 'Winner'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface SEMatchCardProps {
  match: TournamentMatch;
  matchNumber: number;
  roundName: string;
  currentUserId?: string;
  isEventCreator: boolean;
  onSubmitResult?: (matchId: string, winnerId: string) => Promise<void>;
  onConfirmResult?: (matchId: string) => Promise<void>;
  onDisputeResult?: (matchId: string, reason: string) => Promise<void>;
  getStatusIcon: (match: TournamentMatch) => React.ReactNode;
}

const SEMatchCard: React.FC<SEMatchCardProps> = ({
  match,
  matchNumber,
  roundName,
  currentUserId,
  isEventCreator,
  onSubmitResult,
  onConfirmResult,
  onDisputeResult,
  getStatusIcon
}) => {
  const [showResultForm, setShowResultForm] = React.useState(false);
  const [selectedWinner, setSelectedWinner] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmitResult = async () => {
    if (!onSubmitResult || !selectedWinner) return;
    
    setSubmitting(true);
    try {
      await onSubmitResult(match.matchId, selectedWinner);
      setShowResultForm(false);
      setSelectedWinner('');
    } catch (error) {
      console.error('Failed to submit result:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResult = async () => {
    if (!onConfirmResult) return;
    
    try {
      await onConfirmResult(match.matchId);
    } catch (error) {
      console.error('Failed to confirm result:', error);
    }
  };

  const handleDisputeResult = async () => {
    if (!onDisputeResult) return;
    
    try {
      const reason = prompt('Please enter a reason for disputing this result:');
      if (reason && reason.trim()) {
        await onDisputeResult(match.matchId, reason.trim());
      }
    } catch (error) {
      console.error('Failed to dispute result:', error);
    }
  };

  const canSubmitResult = () => {
    if (!currentUserId || match.status !== 'pending') return false;
    if (match.player1.id === 'TBD' || match.player2.id === 'TBD') return false;
    return isEventCreator || match.player1.id === currentUserId || match.player2.id === currentUserId;
  };

  const canConfirmResult = () => {
    if (!currentUserId || match.status !== 'submitted') return false;
    if (isEventCreator) return true;
    
    const reportedBy = match.resultReportedBy || [];
    return (match.player1.id === currentUserId || match.player2.id === currentUserId) && 
           !reportedBy.includes(currentUserId);
  };

  const isUserInMatch = currentUserId && (match.player1.id === currentUserId || match.player2.id === currentUserId);
  const isTBDMatch = match.player1.id === 'TBD' || match.player2.id === 'TBD';

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      isUserInMatch 
        ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10' 
        : 'border-gray-200 dark:border-gray-700'
    } ${isTBDMatch ? 'opacity-60' : ''}`}>
      
      {/* Match Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-2">
            {roundName} - Match {matchNumber}
          </span>
          {getStatusIcon(match)}
        </div>
        
        {match.winnerId && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            Winner: {match.winnerId === match.player1.id ? match.player1.name : match.player2.name}
          </span>
        )}
      </div>

      {/* Players */}
      <div className="space-y-2 mb-4">
        <div className={`p-2 rounded text-sm ${
          match.winnerId === match.player1.id 
            ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-700 font-semibold' 
            : match.winnerId && match.winnerId !== match.player1.id
            ? 'bg-gray-100 dark:bg-gray-700/50 opacity-75'
            : 'bg-gray-50 dark:bg-gray-700/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white">
              {match.player1.name}
              {match.player1.id === currentUserId && (
                <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded">
                  You
                </span>
              )}
            </span>
            {match.winnerId === match.player1.id && (
              <span className="text-green-600 dark:text-green-400 text-xs font-bold">W</span>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400">vs</div>

        <div className={`p-2 rounded text-sm ${
          match.winnerId === match.player2.id 
            ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-700 font-semibold' 
            : match.winnerId && match.winnerId !== match.player2.id
            ? 'bg-gray-100 dark:bg-gray-700/50 opacity-75'
            : 'bg-gray-50 dark:bg-gray-700/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-white">
              {match.player2.name}
              {match.player2.id === currentUserId && (
                <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded">
                  You
                </span>
              )}
            </span>
            {match.winnerId === match.player2.id && (
              <span className="text-green-600 dark:text-green-400 text-xs font-bold">W</span>
            )}
          </div>
        </div>
      </div>

      {/* Submitted Status */}
      {match.status === 'submitted' && (
        <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
          <div className="flex items-center text-orange-700 dark:text-orange-300">
            <ClockIcon className="h-3 w-3 mr-1.5" />
            <span className="text-xs font-medium">Result Submitted - Awaiting Confirmation</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isTBDMatch && (canSubmitResult() || canConfirmResult()) && (
        <div className="flex justify-center space-x-2">
          {canSubmitResult() && !showResultForm && (
            <button
              onClick={() => setShowResultForm(true)}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Submit Result
            </button>
          )}
          
          {canConfirmResult() && (
            <>
              <button
                onClick={handleConfirmResult}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-medium"
              >
                ✅ Accept
              </button>
              <button
                onClick={handleDisputeResult}
                className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 font-medium"
              >
                ⚠️ Contest
              </button>
            </>
          )}
        </div>
      )}

      {/* Result Form */}
      {showResultForm && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded border-t">
          <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">
            Select Winner:
          </div>
          
          <div className="space-y-2 mb-3">
            <button
              onClick={() => setSelectedWinner(match.player1.id)}
              className={`w-full p-2 text-xs rounded border ${
                selectedWinner === match.player1.id
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300'
                  : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              {match.player1.name}
            </button>
            
            <button
              onClick={() => setSelectedWinner(match.player2.id)}
              className={`w-full p-2 text-xs rounded border ${
                selectedWinner === match.player2.id
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300'
                  : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              {match.player2.name}
            </button>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowResultForm(false);
                setSelectedWinner('');
              }}
              className="px-2 py-1 text-gray-600 dark:text-gray-400 text-xs hover:text-gray-800 dark:hover:text-gray-200"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitResult}
              disabled={!selectedWinner || submitting}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-blue-400"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SEBracketView;