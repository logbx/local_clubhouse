import React, { useState } from 'react';
import { TournamentMatch } from '../services/tournament.service';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SwissMatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch;
  onSubmit: (result: 'win' | 'loss' | 'draw') => void;
  allowDraws?: boolean;
  isOrganizer: boolean;
}

export const SwissMatchResultModal: React.FC<SwissMatchResultModalProps> = ({
  isOpen,
  onClose,
  match,
  onSubmit,
  allowDraws = true,
  isOrganizer
}) => {
  const [selectedResult, setSelectedResult] = useState<'win' | 'loss' | 'draw'>('win');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      onSubmit(selectedResult);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[2147483647]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isOrganizer ? 'Set Match Result' : 'Report Match Result'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Match Players</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {match.player1.name}
                </span>
                {match.player1.isGuest && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Guest
                  </span>
                )}
              </div>
              <div className="text-center text-xs text-gray-500 dark:text-gray-400">vs</div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {match.player2.name}
                </span>
                {match.player2.isGuest && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Guest
                  </span>
                )}
              </div>
            </div>
          </div>

          {isOrganizer ? (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Winner</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="result"
                    value="win"
                    checked={selectedResult === 'win'}
                    onChange={(e) => setSelectedResult(e.target.value as 'win')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {match.player1.name} wins
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="result"
                    value="loss"
                    checked={selectedResult === 'loss'}
                    onChange={(e) => setSelectedResult(e.target.value as 'loss')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {match.player2.name} wins
                  </span>
                </label>
                {allowDraws && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="result"
                      value="draw"
                      checked={selectedResult === 'draw'}
                      onChange={(e) => setSelectedResult(e.target.value as 'draw')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      Draw (0.5 points each)
                    </span>
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Report Your Result</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="result"
                    value="win"
                    checked={selectedResult === 'win'}
                    onChange={(e) => setSelectedResult(e.target.value as 'win')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">I won</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="result"
                    value="loss"
                    checked={selectedResult === 'loss'}
                    onChange={(e) => setSelectedResult(e.target.value as 'loss')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">I lost</span>
                </label>
                {allowDraws && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="result"
                      value="draw"
                      checked={selectedResult === 'draw'}
                      onChange={(e) => setSelectedResult(e.target.value as 'draw')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">Draw</span>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Result'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwissMatchResultModal;