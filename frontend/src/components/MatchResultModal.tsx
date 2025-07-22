import React, { useState, useMemo } from 'react';
import { TournamentMatch } from '../services/tournament.service';

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch;
  currentUserId: string;
  isCreator: boolean;
  onSubmitResult: (winnerId: string | null, loserId: string | null, isDraw?: boolean, notes?: string) => Promise<void>;
  onConfirmResult: () => Promise<void>;
  onDisputeResult: (reason: string) => Promise<void>;
  onResolveDispute: (winnerId: string | null, loserId: string | null, isDraw?: boolean, notes?: string) => Promise<void>;
  onForfeit: (forfeitingPlayerId: string) => Promise<void>;
  isSingleElimination?: boolean;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  isOpen,
  onClose,
  match,
  currentUserId,
  isCreator,
  onSubmitResult,
  onConfirmResult,
  onDisputeResult,
  onResolveDispute,
  onForfeit,
  isSingleElimination = true
}) => {
  const [selectedResult, setSelectedResult] = useState<'win' | 'loss' | 'draw'>('win');
  const [notes, setNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmActions, setShowConfirmActions] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  // Add this check at the start of the component
  const userSubmittedResult = useMemo(() => {
    // Check if the current user has already submitted a result
    return match.resultReportedBy?.includes(currentUserId) || false;
  }, [match.resultReportedBy, currentUserId]);

  // Check if the current user submitted the result
  const isSubmitter = useMemo(() => {
    if (!match.resultReportedBy) return false;
    return match.resultReportedBy === currentUserId || 
           (Array.isArray(match.resultReportedBy) && match.resultReportedBy.includes(currentUserId));
  }, [match.resultReportedBy, currentUserId]);

  // Determine if we should show the confirm/dispute section
  const shouldShowConfirmDispute = useMemo(() => {
    const isSubmittedMatch = match.status === 'submitted';
    const isPlayerInMatch = match.player1.id === currentUserId || match.player2.id === currentUserId;
    return isSubmittedMatch && isPlayerInMatch && !isSubmitter;
  }, [match, currentUserId, isSubmitter]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let winnerId: string | null = null;
      let loserId: string | null = null;
      let isDraw = false;

      if (selectedResult === 'draw') {
        isDraw = true;
      } else {
        if (isCreator) {
          // Organizer is reporting the result - use explicit player selection
          winnerId = selectedResult === 'win' ? match.player1.id : match.player2.id;
          loserId = selectedResult === 'win' ? match.player2.id : match.player1.id;
        } else {
          // Player is reporting their own result
          const isPlayer1 = match.player1.id === currentUserId;
          winnerId = selectedResult === 'win' ? currentUserId : (isPlayer1 ? match.player2.id : match.player1.id);
          loserId = selectedResult === 'win' ? (isPlayer1 ? match.player2.id : match.player1.id) : currentUserId;
        }
      }

      await onSubmitResult(winnerId, loserId, isDraw, notes);
      onClose();
    } catch (error) {
      console.error('Error submitting result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirmResult();
      onClose();
    } catch (error) {
      console.error('Error confirming result:', error);
      // Show error message to user
      alert('Failed to confirm result. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (isSubmitting || !disputeReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onDisputeResult(disputeReason.trim());
      onClose();
    } catch (error) {
      console.error('Error disputing result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine what actions are available based on match status and user
  // Check if current user submitted the result (more robust checking)
  // Handle multiple ID formats that might be stored in resultReportedBy
  const hasSubmittedResult = match.resultReportedBy && Array.isArray(match.resultReportedBy) 
    ? match.resultReportedBy.some(reporterId => {
        if (!currentUserId) return false;
        // Direct match with currentUserId
        if (reporterId === currentUserId) return true;
        // Try both string formats in case of ObjectId vs string mismatch
        if (reporterId === String(currentUserId)) return true;
        if (String(reporterId) === currentUserId) return true;
        return false;
      }) 
    : false;

  // Additional check: if the match is submitted and we're the only player in the match
  // who can submit results, we likely submitted it (fallback for race conditions)
  const isLikelySubmitter = match.status === 'submitted' && 
    (match.player1.id === currentUserId || match.player2.id === currentUserId) &&
    !hasSubmittedResult && // Only if the primary check failed
    !isCreator; // Creators can submit on behalf of others

  const actuallySubmittedResult = hasSubmittedResult || isLikelySubmitter;
  
  // Debug logging for ID matching issues
  console.log('🔍 Match result modal debug:', {
    matchId: match.matchId,
    currentUserId,
    player1Id: match.player1.id,
    player1UserId: match.player1.id,
    player2Id: match.player2.id,
    player2UserId: match.player2.id,
    resultReportedBy: match.resultReportedBy,
    hasSubmittedResult,
    isLikelySubmitter,
    actuallySubmittedResult,
    matchStatus: match.status,
    isCreator
  });
  
  const canConfirmResult = match.status === 'submitted' && !actuallySubmittedResult && !isCreator;
  const canDisputeResult = match.status === 'submitted' && !actuallySubmittedResult;
  const canSubmitResult = match.status === 'pending' && 
    (isCreator || match.player1.id === currentUserId || match.player2.id === currentUserId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {match.status === 'submitted' ? 'Match Result Submitted' : 'Submit Match Result'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {match.player1.name} vs {match.player2.name}
          </p>
          {match.status === 'submitted' && (
            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded">
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Result has been submitted and is awaiting confirmation
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Show result submission form if match is pending or user can submit */}
          {canSubmitResult && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Result
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="result"
                      value="win"
                      checked={selectedResult === 'win'}
                      onChange={(e) => setSelectedResult(e.target.value as 'win' | 'loss' | 'draw')}
                      className="mr-3"
                    />
                    <span>{isCreator ? `${match.player1.name} Won` : 'I Won'}</span>
                  </label>
                  {!isSingleElimination && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="result"
                        value="draw"
                        checked={selectedResult === 'draw'}
                        onChange={(e) => setSelectedResult(e.target.value as 'win' | 'loss' | 'draw')}
                        className="mr-3"
                      />
                      <span>Draw (0.5 points each)</span>
                    </label>
                  )}
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="result"
                      value="loss"
                      checked={selectedResult === 'loss'}
                      onChange={(e) => setSelectedResult(e.target.value as 'win' | 'loss' | 'draw')}
                      className="mr-3"
                    />
                    <span>{isCreator ? `${match.player2.name} Won` : 'I Lost'}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Add any notes about the match result..."
                />
              </div>
            </>
          )}

          {/* Show current result if submitted */}
          {match.status === 'submitted' && match.winnerId && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Submitted Result:
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Winner: {match.winnerId === match.player1.id ? match.player1.name : match.player2.name}
              </p>
            </div>
          )}

          {/* Show dispute form if needed */}
          {canDisputeResult && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dispute Reason
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Please explain why you dispute this result..."
              />
            </div>
          )}

          {/* Show message if user already submitted */}
          {match.status === 'submitted' && hasSubmittedResult && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                You have already submitted the result for this match. Waiting for opponent confirmation.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
          
          {/* Submit result button */}
          {canSubmitResult && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Result'}
            </button>
          )}
          
          {/* Confirm result button */}
          {canConfirmResult && (
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Result'}
            </button>
          )}
          
          {/* Dispute result button */}
          {canDisputeResult && (
            <button
              onClick={handleDispute}
              disabled={isSubmitting || !disputeReason.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Disputing...' : 'Dispute Result'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 