import React from 'react';
import { XCircleIcon } from '@heroicons/react/24/outline';
import { ClubSponsor } from '../types/club';

interface SponsorsModalProps {
  sponsors: ClubSponsor[];
  isOpen: boolean;
  onClose: () => void;
}

const SponsorsModal: React.FC<SponsorsModalProps> = ({ sponsors, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Separate featured and regular sponsors
  const featuredSponsors = sponsors.filter(sponsor => sponsor.isFeatured);
  const regularSponsors = sponsors.filter(sponsor => !sponsor.isFeatured);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            🏆 Club Sponsors
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              ({sponsors.length})
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <XCircleIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {sponsors.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏢</span>
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No sponsors yet
              </h4>
              <p className="text-gray-500 dark:text-gray-400">
                This club hasn't added any sponsors yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Featured Sponsors */}
              {featuredSponsors.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    👑 Featured Sponsors
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {featuredSponsors.map((sponsor, index) => (
                      <div 
                        key={index}
                        className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-4 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-yellow-200 dark:bg-yellow-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">👑</span>
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-900 dark:text-white">
                            {sponsor.name}
                          </h5>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Featured Sponsor
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Sponsors */}
              {regularSponsors.length > 0 && (
                <div>
                  {featuredSponsors.length > 0 && (
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      🏢 Other Sponsors
                    </h4>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {regularSponsors.map((sponsor, index) => (
                      <div 
                        key={index}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">🏢</span>
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-900 dark:text-white">
                            {sponsor.name}
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sponsor
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SponsorsModal; 