import React from 'react';
import { Sponsor } from '../types/sponsor';
import { StarIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { formatMessageTimestamp } from '../utils/formatTimestamp';

interface SponsorTestimonialsProps {
  sponsor: Sponsor;
  onTestimonialsChange: () => void;
}

const SponsorTestimonials: React.FC<SponsorTestimonialsProps> = ({ 
  sponsor, 
  onTestimonialsChange 
}) => {
  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star}>
            {star <= rating ? (
              <StarIconSolid className="h-4 w-4 text-yellow-500" />
            ) : (
              <StarIcon className="h-4 w-4 text-gray-300" />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!sponsor.testimonials || sponsor.testimonials.length === 0) {
    return (
      <div className="text-center py-12">
        <ChatBubbleLeftEllipsisIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No testimonials yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This sponsor hasn't received any testimonials from partnered clubs yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Testimonials ({sponsor.testimonials.length})
        </h3>
      </div>

      <div className="space-y-6">
        {sponsor.testimonials.map((testimonial) => (
          <div 
            key={testimonial.clubId._id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
          >
            {/* Club Info */}
            <div className="flex items-center gap-3 mb-4">
              {testimonial.clubId.logoUrl ? (
                <img 
                  src={testimonial.clubId.logoUrl} 
                  alt={testimonial.clubId.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-300">
                    {testimonial.clubId.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {testimonial.clubId.name}
                </h4>
                <div className="flex items-center gap-2">
                  {renderStars(testimonial.rating)}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatMessageTimestamp(testimonial.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Testimonial Content */}
            <blockquote className="text-gray-700 dark:text-gray-300 italic border-l-4 border-primary-500 pl-4">
              "{testimonial.content}"
            </blockquote>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SponsorTestimonials; 