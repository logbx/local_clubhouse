import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { TournamentMatch } from '../services/tournament.service';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface StandardizedResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch;
  onSubmit: (result: 'win' | 'loss' | 'draw', reason?: string) => void;
  allowDraws?: boolean;
  isSwissTournament?: boolean;
  title?: string;
  submitButtonText?: string;
  initialResult?: 'win' | 'loss' | 'draw';
}

export const StandardizedResultModal: React.FC<StandardizedResultModalProps> = ({
  isOpen,
  onClose,
  match,
  onSubmit,
  allowDraws = true,
  isSwissTournament = false,
  title = 'Set Match Result',
  submitButtonText = 'Set Result',
  initialResult
}) => {
  const [selectedResult, setSelectedResult] = useState<'win' | 'loss' | 'draw'>('win');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine suggested winner for guest player scenarios
  const getSuggestedWinner = (): { suggestion: 'win' | 'loss' | null; message: string } => {
    const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
    
    if (!hasGuestPlayer) {
      return { suggestion: null, message: '' };
    }

    if (match.player1.isGuest && match.player2.isGuest) {
      return { suggestion: null, message: 'Both players are guests - please select winner manually' };
    }

    if (match.player1.isGuest && !match.player2.isGuest) {
      return { 
        suggestion: 'loss', 
        message: `Suggested: ${match.player2.name} wins (registered player)` 
      };
    }

    if (!match.player1.isGuest && match.player2.isGuest) {
      return { 
        suggestion: 'win', 
        message: `Suggested: ${match.player1.name} wins (registered player)` 
      };
    }

    return { suggestion: null, message: '' };
  };

  const { suggestion, message } = getSuggestedWinner();

  // Set initial selection based on initialResult prop or suggestion
  useEffect(() => {
    if (initialResult) {
      setSelectedResult(initialResult);
    } else if (suggestion) {
      setSelectedResult(suggestion);
    }
  }, [initialResult, suggestion]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      onSubmit(selectedResult, reason.trim() || undefined);
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Render modal using Portal to break out of parent containers
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center" 
      style={{ 
        zIndex: 2147483647,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-200 dark:border-gray-700"
        style={{ 
          width: '450px',
          maxWidth: '90vw',
          zIndex: 2147483648
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">
          {title}
        </h3>

        {/* Winner Selection */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Winner</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="result"
                  value="win"
                  checked={selectedResult === 'win'}
                  onChange={(e) => setSelectedResult(e.target.value as 'win')}
                  className="mr-3 h-4 w-4 text-blue-600"
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  {match.player1.name} wins
                </span>
              </div>
              {match.player1.isGuest && (
                <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                  Guest
                </span>
              )}
            </label>
            <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="result"
                  value="loss"
                  checked={selectedResult === 'loss'}
                  onChange={(e) => setSelectedResult(e.target.value as 'loss')}
                  className="mr-3 h-4 w-4 text-blue-600"
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  {match.player2.name} wins
                </span>
              </div>
              {match.player2.isGuest && (
                <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                  Guest
                </span>
              )}
            </label>
            {allowDraws && (
              <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="result"
                  value="draw"
                  checked={selectedResult === 'draw'}
                  onChange={(e) => setSelectedResult(e.target.value as 'draw')}
                  className="mr-3 h-4 w-4 text-blue-600"
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  Draw {isSwissTournament ? '(0.5 points each)' : ''}
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Optional Reason */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Guest players cannot input results themselves..."
            rows={4}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 btn btn-primary"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting...
              </span>
            ) : (
              submitButtonText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StandardizedResultModal;