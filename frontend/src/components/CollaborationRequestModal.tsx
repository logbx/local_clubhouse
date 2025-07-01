import React, { useState } from 'react';
import { Sponsor, CreateCollaborationRequestDto } from '../types/sponsor';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CollaborationRequestModalProps {
  sponsor: Sponsor;
  onClose: () => void;
  onSubmit: (data: CreateCollaborationRequestDto) => Promise<void>;
}

const CollaborationRequestModal: React.FC<CollaborationRequestModalProps> = ({
  sponsor,
  onClose,
  onSubmit
}) => {
  const [proposalText, setProposalText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalText.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        proposalText: proposalText.trim()
      });
    } catch (error) {
      console.error('Failed to submit collaboration request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Request Collaboration with {sponsor.name}
            </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="proposalText" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Your Proposal
            </label>
            <textarea
              id="proposalText"
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              placeholder="Describe how you'd like to collaborate..."
              className="w-full h-32 px-3 py-2 text-gray-700 dark:text-gray-300 border rounded-lg focus:outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:border-blue-400"
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !proposalText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollaborationRequestModal; 