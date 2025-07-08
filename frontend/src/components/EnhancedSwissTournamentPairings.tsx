import React, { useState } from 'react';
import { TournamentMatch, TournamentRound, TournamentPlayer } from '../services/tournament.service';
import { CheckIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { StandardizedResultModal } from './StandardizedResultModal';

interface EnhancedSwissTournamentPairingsProps {
  round: TournamentRound;
  currentRound: number;
  totalRounds: number;
  onReportResult: (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => void;
  isOrganizer: boolean;
  allowDraws?: boolean;
  currentUserId?: string;
}

interface MatchCardProps {
  match: TournamentMatch;
  matchIndex: number;
  onReportResult: (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => void;
  isOrganizer: boolean;
  allowDraws: boolean;
  currentUserId?: string;
}

interface ByePlayerCardProps {
  player: TournamentPlayer;
  roundNumber: number;
}

const ByePlayerCard: React.FC<ByePlayerCardProps> = ({ player, roundNumber }) => {
  return (
    <div className="border-2 border-dashed border-yellow-400 dark:border-yellow-500 rounded-lg p-4 m-2 backdrop-blur-sm bg-yellow-50/60 dark:bg-yellow-900/20 transition-colors duration-200">
      <div className="text-sm font-semibold mb-3 text-yellow-700 dark:text-yellow-400">
        Bye - Auto Advance
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-100/80 dark:bg-yellow-800/40 border border-yellow-300 dark:border-yellow-600">
          <div className="flex items-center">
            <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
            <span className="ml-2 text-yellow-600 dark:text-yellow-400 text-sm">✓ Gets 1 Point</span>
          </div>
          {player.isGuest && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Guest
            </span>
          )}
        </div>
        
        <div className="text-center text-yellow-600 dark:text-yellow-400 font-medium text-sm">
          No opponent - automatic 1 point
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200">
          <ClockIcon className="h-3 w-3 mr-1" />
          Bye Round
        </span>
      </div>
    </div>
  );
};

const SwissMatchCard: React.FC<MatchCardProps> = ({
  match,
  matchIndex,
  onReportResult,
  isOrganizer,
  allowDraws,
  currentUserId
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedWinner, setSelectedWinner] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Check if current user is a player in this match
  const isPlayerInMatch = currentUserId && (
    match.player1.userId === currentUserId || 
    match.player2.userId === currentUserId ||
    match.player1.id === currentUserId || 
    match.player2.id === currentUserId
  );
  const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
  
  // Can report if organizer or if player in match
  const canReport = isOrganizer || isPlayerInMatch;
  
  // Check if current user submitted the result
  const hasSubmittedResult = match.resultReportedBy?.includes(currentUserId || '') || false;
  
  // Allow both players in match AND organizers to confirm submitted results
  const canConfirm = match.status === 'submitted' && (
    (isPlayerInMatch && !hasSubmittedResult) || 
    isOrganizer
  );
  
  // Show dispute button if user is in match, match is submitted, and user did NOT submit the result
  const canDispute = match.status === 'submitted' && isPlayerInMatch && !hasSubmittedResult;

  // Show resolve button if user is organizer and match is disputed
  const canResolve = match.status === 'disputed' && isOrganizer;

  const getMatchStatusColor = () => {
    switch (match.status) {
      case 'completed': 
        return 'bg-green-50/80 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      case 'submitted': 
        return 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
      case 'confirmed': 
        return 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
      case 'disputed': 
        return 'bg-red-50/80 dark:bg-red-900/20 border-red-300 dark:border-red-700';
      case 'pending': 
        return 'bg-gray-50/80 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
      case 'forfeit': 
        return 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
      default: 
        return 'bg-gray-50/80 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
    }
  };

  const handleResult = (result: 'win' | 'loss' | 'draw') => {
    // Allow result submission for pending matches or admin override for completed matches
    console.log('🏓 Submitting match result:', {
      matchId: match.matchId,
      currentStatus: match.status,
      result: result
    });
    
    onReportResult(match, result);
    setShowReportModal(false);
  };
  
  const handleConfirmResult = async () => {
    // This would need to be implemented with the proper tournament service call
    console.log('Confirming result for Swiss match:', match.matchId);
    // onConfirmResult?.(match);
  };
  
  const handleDisputeResult = async () => {
    if (!disputeReason.trim()) {
      alert('Please provide a reason for the dispute.');
      return;
    }
    
    setDisputing(true);
    try {
      console.log('Disputing result for Swiss match:', match.matchId, disputeReason);
      // This would need to be implemented with the proper tournament service call
      // await tournamentService.disputeMatchResult(tournamentId, match.matchId, disputeReason.trim());
      setShowDisputeModal(false);
      setDisputeReason('');
    } catch (error) {
      console.error('Failed to dispute result:', error);
      alert('Failed to dispute result. Please try again.');
    } finally {
      setDisputing(false);
    }
  };
  
  const handleResolveDispute = async () => {
    if (!selectedWinner) {
      alert('Please select a winner to resolve the dispute.');
      return;
    }
    
    setResolving(true);
    try {
      console.log('Resolving dispute for Swiss match:', match.matchId, selectedWinner);
      // This would need to be implemented with the proper tournament service call
      setShowResolveModal(false);
      setSelectedWinner('');
      setResolutionNotes('');
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
      alert('Failed to resolve dispute. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const isDraw = match.isDraw || match.result?.isDraw;

  return (
    <div className={`border-2 rounded-lg p-4 m-2 backdrop-blur-sm ${getMatchStatusColor()} transition-colors duration-200`}>
      <div className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
        {match.status === 'completed' && (
          <span className="text-gray-600 dark:text-gray-400">Match {matchIndex + 1} Complete</span>
        )}
        {match.status !== 'completed' && (
          <span className="text-gray-600 dark:text-gray-400">Match {matchIndex + 1}</span>
        )}
      </div>
      
      {/* Players */}
      <div className="space-y-2">
        <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
          match.winnerId === match.player1.id 
            ? 'bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600' 
            : isDraw 
            ? 'bg-blue-100 dark:bg-blue-800/50 border border-blue-300 dark:border-blue-600'
            : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600'
        }`}>
          <div className="flex items-center">
            <span className="font-medium text-gray-900 dark:text-white">{match.player1.name}</span>
            {match.winnerId === match.player1.id && (
              <CheckIcon className="h-4 w-4 ml-2 text-green-600 dark:text-green-400" />
            )}
            {isDraw && match.status === 'completed' && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">0.5</span>
            )}
          </div>
          {match.player1.isGuest && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Guest
            </span>
          )}
        </div>
        
        <div className="text-center text-gray-500 dark:text-gray-400 font-medium">vs</div>
        
        <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
          match.winnerId === match.player2.id 
            ? 'bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600' 
            : isDraw 
            ? 'bg-blue-100 dark:bg-blue-800/50 border border-blue-300 dark:border-blue-600'
            : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600'
        }`}>
          <div className="flex items-center">
            <span className="font-medium text-gray-900 dark:text-white">{match.player2.name}</span>
            {match.winnerId === match.player2.id && (
              <CheckIcon className="h-4 w-4 ml-2 text-green-600 dark:text-green-400" />
            )}
            {isDraw && match.status === 'completed' && (
              <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">0.5</span>
            )}
          </div>
          {match.player2.isGuest && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Guest
            </span>
          )}
        </div>
      </div>

      {/* Match Status */}
      <div className="mt-4">
        {match.status === 'completed' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center justify-center text-green-700 dark:text-green-300 mb-2">
              <CheckIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {isDraw ? 'Draw' : match.winnerId === match.player1.id ? `${match.player1.name} Won` : `${match.player2.name} Won`}
              </span>
            </div>
            {isOrganizer && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full btn btn-outline btn-sm mt-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 border-orange-300 dark:border-orange-600"
              >
                Override Result (Admin)
              </button>
            )}
          </div>
        )}

        {match.status === 'submitted' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <div className="flex items-center text-orange-700 dark:text-orange-300 mb-2">
              <ClockIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Result Submitted - Awaiting Confirmation</span>
            </div>
            <div className="space-y-2">
              {canConfirm && !isOrganizer && (
                <button 
                  onClick={handleConfirmResult}
                  className="w-full btn btn-success text-sm py-2"
                >
                  Confirm Result
                </button>
              )}
              {canDispute && (
                <button 
                  onClick={() => setShowDisputeModal(true)}
                  className="w-full btn btn-warning text-sm py-2"
                >
                  Dispute Result
                </button>
              )}
              {isOrganizer && (
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="w-full btn btn-primary text-sm py-2"
                >
                  Set Result (Admin)
                </button>
              )}
            </div>
          </div>
        )}

        {match.status === 'disputed' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center text-red-700 dark:text-red-300 mb-2">
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Result Disputed</span>
            </div>
            {match.result?.disputeReason && (
              <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                Reason: {match.result.disputeReason}
              </div>
            )}
            {isOrganizer && (
              <div className="space-y-2">
                <button 
                  onClick={() => setShowResolveModal(true)}
                  className="w-full btn btn-primary text-sm py-2"
                >
                  Resolve Dispute
                </button>
                <button 
                  onClick={() => setShowReportModal(true)}
                  className="w-full btn btn-secondary text-sm py-2"
                >
                  Set Result (Admin)
                </button>
              </div>
            )}
          </div>
        )}

        {match.status === 'confirmed' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center text-blue-700 dark:text-blue-300 mb-2">
              <CheckIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Result Confirmed - Processing</span>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
              Both players have confirmed the result
            </div>
            {isOrganizer && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full btn btn-secondary text-sm py-2"
              >
                Override Result (Admin)
              </button>
            )}
          </div>
        )}

        {match.status === 'pending' && (
          <div className="space-y-2">
            {canReport && !isOrganizer && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full btn btn-primary"
                disabled={match.status !== 'pending'}
              >
                Report Result
              </button>
            )}
            {isOrganizer && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full btn btn-primary"
              >
                Set Result (Admin)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Match Result Modal */}
      {showReportModal && (
        <StandardizedResultModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          match={match}
          onSubmit={handleResult}
          allowDraws={allowDraws}
          isSwissTournament={true}
        />
      )}
      
      {/* Dispute Result Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[2147483647]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Dispute Match Result
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reason for dispute
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Please explain why you are disputing this result..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={handleDisputeResult}
                disabled={!disputeReason.trim() || disputing}
                className="flex-1 btn btn-primary"
              >
                {disputing ? 'Disputing...' : 'Dispute'}
              </button>
              <button 
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeReason('');
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Resolve Dispute Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[2147483647]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Resolve Match Dispute
            </h3>
            
            {match.result?.disputeReason && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Dispute reason:</strong> {match.result.disputeReason}
                </p>
              </div>
            )}
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="winner" 
                  value={match.player1.id}
                  checked={selectedWinner === match.player1.id}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  {match.player1.name} wins
                </span>
              </label>
              
              <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="winner" 
                  value={match.player2.id}
                  checked={selectedWinner === match.player2.id}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  {match.player2.name} wins
                </span>
              </label>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resolution notes (optional)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add any notes about how this dispute was resolved..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={handleResolveDispute}
                disabled={!selectedWinner || resolving}
                className="flex-1 btn btn-primary"
              >
                {resolving ? 'Resolving...' : 'Resolve'}
              </button>
              <button 
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedWinner('');
                  setResolutionNotes('');
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const EnhancedSwissTournamentPairings: React.FC<EnhancedSwissTournamentPairingsProps> = ({
  round,
  currentRound,
  totalRounds,
  onReportResult,
  isOrganizer,
  allowDraws = true,
  currentUserId
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Current Round {round.roundNumber} Pairings
        </h3>
        {round.roundNumber === currentRound && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200">
            Active Round
          </span>
        )}
      </div>

      {/* Matches Grid - 4 per row to match single elimination style */}
      {round.matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {round.matches.map((match, index) => (
            <SwissMatchCard
              key={match.matchId}
              match={match}
              matchIndex={index}
              onReportResult={onReportResult}
              isOrganizer={isOrganizer}
              allowDraws={allowDraws}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* Bye Players */}
      {round.byePlayers && round.byePlayers.length > 0 && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Bye Players (Automatic 1 Point)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {round.byePlayers.map((player, index) => (
                <ByePlayerCard
                  key={`bye-${player.id}-${index}`}
                  player={player}
                  roundNumber={round.roundNumber}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Round Status */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-blue-700 dark:text-blue-300">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">
              Round {round.roundNumber} of {totalRounds}
            </span>
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            {round.matches.filter(m => m.status === 'completed').length} of {round.matches.length} matches complete
          </div>
        </div>
        {round.isComplete && (
          <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Round Complete - Next round will start automatically
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSwissTournamentPairings;