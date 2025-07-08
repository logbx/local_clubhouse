import React from 'react';
import { ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Tournament, TournamentRound, TournamentMatch } from '../../../services/tournament.service';

interface SwissRoundViewProps {
  tournament: Tournament;
  round: TournamentRound;
  currentUserId?: string;
  isEventCreator: boolean;
  onSubmitResult?: (matchId: string, result: 'win' | 'loss' | 'draw', winnerId?: string) => Promise<void>;
  onConfirmResult?: (matchId: string) => Promise<void>;
  onDisputeResult?: (matchId: string, reason: string) => Promise<void>;
}

const SwissRoundView: React.FC<SwissRoundViewProps> = ({
  tournament,
  round,
  currentUserId,
  isEventCreator,
  onSubmitResult,
  onConfirmResult,
  onDisputeResult
}) => {
  const isCurrentRound = tournament.currentRound === round.roundNumber;
  const isCompleted = round.isComplete;

  const getMatchStatusIcon = (match: TournamentMatch) => {
    switch (match.status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'submitted':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'disputed':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getMatchStatusText = (match: TournamentMatch) => {
    switch (match.status) {
      case 'completed':
        return 'Complete';
      case 'submitted':
        return 'Awaiting Confirmation';
      case 'disputed':
        return 'Disputed';
      default:
        return 'Pending';
    }
  };

  const getResultText = (match: TournamentMatch) => {
    if (match.status === 'pending') return null;
    
    if (match.result === 'draw') {
      return 'Draw';
    }
    
    if (match.winnerId) {
      const winner = match.winnerId === match.player1.id ? match.player1 : match.player2;
      return `${winner.name} won`;
    }
    
    return 'Result pending';
  };

  const canSubmitResult = (match: TournamentMatch) => {
    if (!currentUserId || match.status !== 'pending') return false;
    return isEventCreator || match.player1.id === currentUserId || match.player2.id === currentUserId;
  };

  const canConfirmResult = (match: TournamentMatch) => {
    if (!currentUserId || match.status !== 'submitted') return false;
    if (isEventCreator) return true;
    
    // Player can confirm if they didn't submit the result
    const reportedBy = match.resultReportedBy || [];
    return (match.player1.id === currentUserId || match.player2.id === currentUserId) && 
           !reportedBy.includes(currentUserId);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Round {round.roundNumber}
          </h2>
          {isCurrentRound && (
            <span className="ml-3 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm rounded-full">
              Current
            </span>
          )}
          {isCompleted && (
            <span className="ml-3 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-full">
              Complete
            </span>
          )}
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {round.matches.filter(m => m.status === 'completed').length} / {round.matches.length} matches complete
        </div>
      </div>

      {/* Bye Players */}
      {round.byePlayers && round.byePlayers.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            Bye Players (Automatic Win)
          </h3>
          <div className="flex flex-wrap gap-2">
            {round.byePlayers.map(player => (
              <span 
                key={player.id}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                {player.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Matches */}
      <div className="space-y-4">
        {round.matches.map((match, index) => (
          <SwissMatchCard
            key={match.matchId}
            match={match}
            matchNumber={index + 1}
            currentUserId={currentUserId}
            isEventCreator={isEventCreator}
            canSubmit={canSubmitResult(match)}
            canConfirm={canConfirmResult(match)}
            onSubmitResult={onSubmitResult}
            onConfirmResult={onConfirmResult}
            onDisputeResult={onDisputeResult}
            getStatusIcon={getMatchStatusIcon}
            getStatusText={getMatchStatusText}
            getResultText={getResultText}
          />
        ))}
      </div>
    </div>
  );
};

interface SwissMatchCardProps {
  match: TournamentMatch;
  matchNumber: number;
  currentUserId?: string;
  isEventCreator: boolean;
  canSubmit: boolean;
  canConfirm: boolean;
  onSubmitResult?: (matchId: string, result: 'win' | 'loss' | 'draw', winnerId?: string) => Promise<void>;
  onConfirmResult?: (matchId: string) => Promise<void>;
  onDisputeResult?: (matchId: string, reason: string) => Promise<void>;
  getStatusIcon: (match: TournamentMatch) => React.ReactNode;
  getStatusText: (match: TournamentMatch) => string;
  getResultText: (match: TournamentMatch) => string | null;
}

const SwissMatchCard: React.FC<SwissMatchCardProps> = ({
  match,
  matchNumber,
  currentUserId,
  isEventCreator,
  canSubmit,
  canConfirm,
  onSubmitResult,
  onConfirmResult,
  onDisputeResult,
  getStatusIcon,
  getStatusText,
  getResultText
}) => {
  const [showResultForm, setShowResultForm] = React.useState(false);
  const [selectedResult, setSelectedResult] = React.useState<'win' | 'loss' | 'draw'>('win');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmitResult = async () => {
    if (!onSubmitResult) return;
    
    setSubmitting(true);
    try {
      if (selectedResult === 'draw') {
        await onSubmitResult(match.matchId, 'draw');
      } else if (selectedResult === 'win') {
        await onSubmitResult(match.matchId, 'win', match.player1.id);
      } else {
        await onSubmitResult(match.matchId, 'loss', match.player2.id);
      }
      setShowResultForm(false);
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

  const isUserInMatch = currentUserId && (match.player1.id === currentUserId || match.player2.id === currentUserId);

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      isUserInMatch 
        ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10' 
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-3">
            Match {matchNumber}
          </span>
          {getStatusIcon(match)}
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            {getStatusText(match)}
          </span>
        </div>
        
        {getResultText(match) && (
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {getResultText(match)}
          </span>
        )}
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className={`p-3 rounded-lg ${
          match.winnerId === match.player1.id 
            ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-700' 
            : 'bg-gray-50 dark:bg-gray-700/50'
        }`}>
          <div className="font-medium text-gray-900 dark:text-white">
            {match.player1.name}
            {match.player1.id === currentUserId && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                You
              </span>
            )}
          </div>
          {match.player1.isGuest && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
              Guest
            </span>
          )}
        </div>

        <div className={`p-3 rounded-lg ${
          match.winnerId === match.player2.id 
            ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-700' 
            : 'bg-gray-50 dark:bg-gray-700/50'
        }`}>
          <div className="font-medium text-gray-900 dark:text-white">
            {match.player2.name}
            {match.player2.id === currentUserId && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                You
              </span>
            )}
          </div>
          {match.player2.isGuest && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
              Guest
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {(canSubmit || canConfirm) && (
        <div className="flex items-center justify-end space-x-2">
          {canSubmit && !showResultForm && (
            <button
              onClick={() => setShowResultForm(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              Submit Result
            </button>
          )}
          
          {canConfirm && (
            <button
              onClick={handleConfirmResult}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
            >
              Confirm Result
            </button>
          )}
        </div>
      )}

      {/* Result Form */}
      {showResultForm && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Submit Match Result
          </h4>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={() => setSelectedResult('win')}
              className={`p-2 text-sm rounded border ${
                selectedResult === 'win'
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300'
                  : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              {match.player1.name} Wins
            </button>
            
            <button
              onClick={() => setSelectedResult('draw')}
              className={`p-2 text-sm rounded border ${
                selectedResult === 'draw'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300'
                  : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              Draw
            </button>
            
            <button
              onClick={() => setSelectedResult('loss')}
              className={`p-2 text-sm rounded border ${
                selectedResult === 'loss'
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300'
                  : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              {match.player2.name} Wins
            </button>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowResultForm(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 text-sm hover:text-gray-800 dark:hover:text-gray-200"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitResult}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwissRoundView;