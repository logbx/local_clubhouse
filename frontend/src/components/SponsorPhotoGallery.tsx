import React from 'react';
import { Sponsor } from '../types/sponsor';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface SponsorPhotoGalleryProps {
  sponsor: Sponsor;
  isOwner: boolean;
  onGalleryChange: () => void;
}

const SponsorPhotoGallery: React.FC<SponsorPhotoGalleryProps> = ({ 
  sponsor, 
  isOwner, 
  onGalleryChange 
}) => {
  if (!sponsor.galleryImages || sponsor.galleryImages.length === 0) {
    return (
      <div className="text-center py-12">
        <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No photos yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {isOwner 
            ? 'Add photos to showcase your organization and activities.'
            : 'This sponsor hasn\'t added any photos yet.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Photo Gallery
        </h3>
        {isOwner && (
          <button className="btn btn-primary btn-sm">
            Add Photos
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sponsor.galleryImages.map((imageUrl, index) => (
          <div 
            key={index} 
            className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          >
            <img 
              src={imageUrl} 
              alt={`${sponsor.name} gallery ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNNTAgNTBIMTUwVjE1MEg1MFY1MFoiIGZpbGw9IiNEMUQ1REIiLz48L3N2Zz4=';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SponsorPhotoGallery; 