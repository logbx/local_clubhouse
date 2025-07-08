import React, { useState } from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Submit Match Result
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {match.player1.name} vs {match.player2.name}
          </p>
        </div>

        <div className="space-y-4">
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
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Result'}
          </button>
        </div>
      </div>
    </div>
  );
}; 