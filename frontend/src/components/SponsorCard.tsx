import React from 'react';
import { Link } from 'react-router-dom';
import { Sponsor } from '../types/sponsor';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { 
  BuildingOfficeIcon,
  MapPinIcon,
  StarIcon,
  CalendarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface SponsorCardProps {
  sponsor: Sponsor;
  showActions?: boolean;
}

const SponsorCard: React.FC<SponsorCardProps> = ({ sponsor, showActions = false }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <Link to={`/sponsors/${sponsor.username}`} className="block">
        {/* Sponsor Header */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Sponsor Logo */}
            <div className="flex-shrink-0">
              {sponsor.logoUrl ? (
                <img 
                  src={sponsor.logoUrl} 
                  alt={sponsor.name}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-primary-100 dark:border-primary-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-primary-600 dark:text-primary-300" />
                </div>
              )}
            </div>

            {/* Sponsor Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {sponsor.name}
                </h3>
                {sponsor.isVerified && (
                  <SparklesIcon className="h-4 w-4 text-blue-500" title="Verified Sponsor" />
                )}
                {sponsor.isFeatured && (
                  <StarIcon className="h-4 w-4 text-yellow-500" title="Featured Sponsor" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                @{sponsor.username}
              </p>
              
              {/* Category and Location */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                {sponsor.category && (
                  <span className="px-2 py-1 bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded-full">
                    {sponsor.category}
                  </span>
                )}
                {sponsor.locations.length > 0 && (
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" />
                    <span>{sponsor.locations[0]}</span>
                    {sponsor.locations.length > 1 && (
                      <span>+{sponsor.locations.length - 1}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{sponsor.stats.totalEventsSponsored} events</span>
                </div>
                <div className="flex items-center gap-1">
                  <BuildingOfficeIcon className="h-3 w-3" />
                  <span>{sponsor.stats.totalClubsPartnered} clubs</span>
                </div>
                <div className="flex items-center gap-1">
                  <StarIcon className="h-3 w-3" />
                  <span>{sponsor.followers.length} followers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {sponsor.bio && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-4 line-clamp-3">
              {sponsor.bio}
            </p>
          )}
        </div>

        {/* Gallery Preview */}
        {sponsor.galleryImages.length > 0 && (
          <div className="px-6 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {sponsor.galleryImages.slice(0, 3).map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${sponsor.name} gallery ${index + 1}`}
                  className="w-full h-16 object-cover rounded"
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer with Testimonials */}
        {sponsor.testimonials.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {sponsor.testimonials.length} testimonial{sponsor.testimonials.length !== 1 ? 's' : ''}
              </p>
              {sponsor.testimonials.some(t => t.rating) && (
                <div className="flex items-center gap-1">
                  <StarIcon className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {(sponsor.testimonials.reduce((sum, t) => sum + (t.rating || 0), 0) / sponsor.testimonials.length).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Creator Info */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-100 dark:border-gray-600">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Created {formatMessageTimestamp(sponsor.createdAt)}
          </p>
        </div>
      </Link>
    </div>
  );
};

export default SponsorCard; 