import React, { useState, useEffect } from 'react';
import { PhotoIcon, XMarkIcon, PlusIcon, CloudArrowUpIcon, PlayIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { uploadService } from '../services/upload.service';
import { toast } from 'react-toastify';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnail?: string; // For videos, we might want to generate thumbnails later
}

interface ClubPhotoGalleryProps {
  photos: string[]; // Legacy support - will be converted to MediaItem[]
  onPhotosChange: (photos: string[]) => void;
  className?: string;
  isEditable?: boolean;
}

// Modal component for viewing all media
const MediaViewerModal: React.FC<{
  media: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemove?: (index: number) => void;
  isEditable?: boolean;
}> = ({ media, isOpen, onClose, onRemove, isEditable = false }) => {
  const [selectedMedia, setSelectedMedia] = useState<{ item: MediaItem; index: number } | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleMediaClick = (item: MediaItem, index: number) => {
    setSelectedMedia({ item, index });
  };

  const closeFullView = () => {
    setSelectedMedia(null);
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (selectedMedia && media.length > 1) {
      if (isLeftSwipe) {
        // Swipe left - next image
        const currentIndex = selectedMedia.index;
        const nextIndex = currentIndex === media.length - 1 ? 0 : currentIndex + 1;
        setSelectedMedia({ item: media[nextIndex], index: nextIndex });
      } else if (isRightSwipe) {
        // Swipe right - previous image
        const currentIndex = selectedMedia.index;
        const prevIndex = currentIndex === 0 ? media.length - 1 : currentIndex - 1;
        setSelectedMedia({ item: media[prevIndex], index: prevIndex });
      }
    }
  };

  // Handle keyboard navigation - moved before conditional return
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          if (selectedMedia) {
            closeFullView();
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          if (selectedMedia && media.length > 1) {
            e.preventDefault();
            const currentIndex = selectedMedia.index;
            const prevIndex = currentIndex === 0 ? media.length - 1 : currentIndex - 1;
            setSelectedMedia({ item: media[prevIndex], index: prevIndex });
          }
          break;
        case 'ArrowRight':
          if (selectedMedia && media.length > 1) {
            e.preventDefault();
            const currentIndex = selectedMedia.index;
            const nextIndex = currentIndex === media.length - 1 ? 0 : currentIndex + 1;
            setSelectedMedia({ item: media[nextIndex], index: nextIndex });
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedMedia, onClose, media]);

  // Reset selected media when modal closes
  useEffect(() => {
    if (!isOpen && selectedMedia) {
      setSelectedMedia(null);
    }
  }, [isOpen, selectedMedia]);

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PhotoIcon className="h-5 w-5" />
              All Media ({media.length})
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <XCircleIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {media.map((item, index) => (
                <div 
                  key={index} 
                  className="relative group aspect-square cursor-pointer"
                  onClick={() => handleMediaClick(item, index)}
                >
                  {item.type === 'video' ? (
                    <div className="relative w-full h-full">
                      <video
                        src={item.url}
                        className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-200"
                        controls={false}
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg group-hover:bg-opacity-50 transition-all">
                        <PlayIcon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={`Media ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg hover:scale-105 transition-transform duration-200"
                    />
                  )}
                  {isEditable && onRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen media viewer */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeFullView();
            }
          }}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[75vh] flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeFullView}
              className="absolute top-4 right-4 p-3 bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-all duration-200 z-20 hover:scale-110"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>

            {/* Previous button */}
            {media.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = selectedMedia.index;
                  const prevIndex = currentIndex === 0 ? media.length - 1 : currentIndex - 1;
                  setSelectedMedia({ item: media[prevIndex], index: prevIndex });
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-all duration-200 z-20 hover:scale-110"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next button */}
            {media.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = selectedMedia.index;
                  const nextIndex = currentIndex === media.length - 1 ? 0 : currentIndex + 1;
                  setSelectedMedia({ item: media[nextIndex], index: nextIndex });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-all duration-200 z-20 hover:scale-110"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Media counter */}
            {media.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black bg-opacity-60 text-white rounded-full text-sm z-20">
                {selectedMedia.index + 1} of {media.length}
              </div>
            )}

            {/* Delete button for admin */}
            {isEditable && onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(selectedMedia.index);
                  closeFullView();
                }}
                className="absolute top-4 left-4 p-3 bg-red-500 bg-opacity-80 text-white rounded-full hover:bg-opacity-100 transition-all duration-200 z-20 hover:scale-110"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
            
            {/* Media content */}
            <div 
              className="w-full h-full flex items-center justify-center"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {selectedMedia.item.type === 'video' ? (
                <video
                  src={selectedMedia.item.url}
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={selectedMedia.item.url}
                  alt={`Media ${selectedMedia.index + 1}`}
                  className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Hook for window size
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

const ClubPhotoGallery: React.FC<ClubPhotoGalleryProps> = ({
  photos,
  onPhotosChange,
  className = '',
  isEditable = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ item: MediaItem; index: number } | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { width } = useWindowSize();

  // Convert legacy photos array to MediaItem array
  const mediaItems: MediaItem[] = photos.map(url => ({
    url,
    type: url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov') || url.toLowerCase().includes('.webm') ? 'video' : 'image'
  }));

  // Calculate grid columns and max items based on screen width
  const getGridConfig = () => {
    if (width < 480) return { cols: 6, maxItems: 12 }; // 2x6 on very narrow
    if (width < 768) return { cols: 3, maxItems: 6 };  // 2x3 on mobile
    if (width < 1024) return { cols: 4, maxItems: 8 }; // 2x4 on tablet
    return { cols: 5, maxItems: 10 }; // 2x5 on desktop
  };

  const { cols, maxItems } = getGridConfig();

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const mediaFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (mediaFiles.length === 0) {
      toast.error('Please select image or video files only');
      return;
    }

    setUploading(true);
    
    try {
      const fileType = mediaFiles.some(file => file.type.startsWith('video/')) ? 'media files' : 'images';
      toast.loading(`Uploading ${mediaFiles.length} ${fileType}...`);

      const uploadPromises = mediaFiles.map(async (file: File) => {
        // Validate file size (5MB limit for both images and videos)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`${file.name} exceeds 5MB limit`);
        }

        const { signedUrl, publicUrl } = await uploadService.getSignedUrl(
          file.name,
          file.type,
          'club-gallery'
        );

        await uploadService.uploadToS3(file, signedUrl);
        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newPhotos = [...photos, ...uploadedUrls];
      
      onPhotosChange(newPhotos);
      toast.dismiss();
      toast.success(`Successfully uploaded ${uploadedUrls.length} image(s)`);
    } catch (error) {
      console.error('Gallery upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload images';
      toast.dismiss();
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    toast.success('Media removed from gallery');
  };

  const handleModalRemove = (index: number) => {
    removePhoto(index);
  };

  const handleMediaClick = (item: MediaItem, index: number) => {
    setSelectedMedia({ item, index });
  };

  const closeFullView = () => {
    setSelectedMedia(null);
  };

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (selectedMedia && mediaItems.length > 1) {
      if (isLeftSwipe) {
        // Swipe left - next image
        const currentIndex = selectedMedia.index;
        const nextIndex = currentIndex === mediaItems.length - 1 ? 0 : currentIndex + 1;
        setSelectedMedia({ item: mediaItems[nextIndex], index: nextIndex });
      } else if (isRightSwipe) {
        // Swipe right - previous image
        const currentIndex = selectedMedia.index;
        const prevIndex = currentIndex === 0 ? mediaItems.length - 1 : currentIndex - 1;
        setSelectedMedia({ item: mediaItems[prevIndex], index: prevIndex });
      }
    }
  };

  // Handle keyboard navigation for full-screen viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedMedia) return;

      switch (e.key) {
        case 'Escape':
          closeFullView();
          break;
        case 'ArrowLeft':
          if (mediaItems.length > 1) {
            e.preventDefault();
            const currentIndex = selectedMedia.index;
            const prevIndex = currentIndex === 0 ? mediaItems.length - 1 : currentIndex - 1;
            setSelectedMedia({ item: mediaItems[prevIndex], index: prevIndex });
          }
          break;
        case 'ArrowRight':
          if (mediaItems.length > 1) {
            e.preventDefault();
            const currentIndex = selectedMedia.index;
            const nextIndex = currentIndex === mediaItems.length - 1 ? 0 : currentIndex + 1;
            setSelectedMedia({ item: mediaItems[nextIndex], index: nextIndex });
          }
          break;
      }
    };

    if (selectedMedia) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedMedia, mediaItems]);

  const addPhotoByUrl = () => {
    const url = prompt('Enter photo URL:');
    if (url && url.trim()) {
      // Basic URL validation
      try {
        new URL(url.trim());
        const newPhotos = [...photos, url.trim()];
        onPhotosChange(newPhotos);
        toast.success('Photo added to gallery');
      } catch {
        toast.error('Please enter a valid URL');
      }
    }
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
        >
          <PhotoIcon className="h-5 w-5 text-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          Photo Gallery
          {mediaItems.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
              ({mediaItems.length})
            </span>
          )}
        </button>
        {isEditable && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addPhotoByUrl}
              disabled={uploading}
              className="btn btn-secondary btn-sm flex items-center gap-1"
            >
              <PlusIcon className="h-4 w-4" />
              Add URL
            </button>
            <label className="btn btn-primary btn-sm flex items-center gap-1 cursor-pointer">
              <CloudArrowUpIcon className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Media'}
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {mediaItems && mediaItems.length > 0 ? (
        <div className="space-y-4">
          {/* Dynamic responsive grid: 2x6 on very narrow, 2x3 on mobile, 2x4 on tablet, 2x5 on desktop */}
          <div className="grid gap-3 grid-rows-2 auto-rows-max overflow-hidden" 
               style={{
                 gridTemplateColumns: `repeat(${cols}, 1fr)`
               }}>
            {mediaItems.slice(0, maxItems).map((item, index) => (
              <div 
                key={index} 
                className="relative group aspect-square cursor-pointer"
                onClick={() => handleMediaClick(item, index)}
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      src={item.url}
                      className="w-full h-full object-cover rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:scale-105 transition-transform duration-200"
                      muted
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg pointer-events-none group-hover:bg-opacity-50 transition-all">
                      <PlayIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`Gallery media ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:scale-105 transition-transform duration-200"
                  />
                )}
                {isEditable && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(index);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Show more media button */}
          {mediaItems.length > maxItems && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                className="btn btn-secondary flex items-center gap-2"
                onClick={() => setShowModal(true)}
              >
                <PhotoIcon className="h-4 w-4" />
                View All {mediaItems.length} Items
              </button>
            </div>
          )}

          {/* Info text */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {mediaItems.length} item{mediaItems.length !== 1 ? 's' : ''} in gallery
          </p>
        </div>
      ) : (
        /* Empty State */
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <PhotoIcon className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No photos in gallery yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                {isEditable
                  ? 'Upload photos and videos to showcase your club activities'
                  : 'This club hasn\'t added any media yet'}
              </p>
              {isEditable && (
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <label className="btn btn-primary cursor-pointer">
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload Media
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={addPhotoByUrl}
                    className="btn btn-secondary"
                  >
                    Add from URL
                  </button>
                </div>
              )}
            </div>
            {isEditable && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Drag & drop images/videos here, or click to browse. PNG, JPG, MP4, MOV up to 5MB each.
              </p>
            )}
          </div>
        </div>
      )}

      {uploading && (
        <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm">Uploading media...</span>
        </div>
      )}

      {/* Media Viewer Modal */}
      <MediaViewerModal
        media={mediaItems}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onRemove={isEditable ? handleModalRemove : undefined}
        isEditable={isEditable}
      />

      {/* Full-screen media viewer for main gallery */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeFullView();
            }
          }}
        >
          <div className="relative w-full h-full max-w-6xl max-h-[75vh] flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeFullView}
              className="absolute top-4 right-4 p-3 bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-all duration-200 z-20 hover:scale-110"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>

            {/* Previous button */}
            {mediaItems.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = selectedMedia.index;
                  const prevIndex = currentIndex === 0 ? mediaItems.length - 1 : currentIndex - 1;
                  setSelectedMedia({ item: mediaItems[prevIndex], index: prevIndex });
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-all duration-200 z-20 hover:scale-110"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next button */}
            {mediaItems.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = selectedMedia.index;
                  const nextIndex = currentIndex === mediaItems.length - 1 ? 0 : currentIndex + 1;
                  setSelectedMedia({ item: mediaItems[nextIndex], index: nextIndex });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-60 text-white rounded-full hover:bg-opacity-80 transition-all duration-200 z-20 hover:scale-110"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Media counter */}
            {mediaItems.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black bg-opacity-60 text-white rounded-full text-sm z-20">
                {selectedMedia.index + 1} of {mediaItems.length}
              </div>
            )}
            
            {/* Media content */}
            <div 
              className="w-full h-full flex items-center justify-center"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {selectedMedia.item.type === 'video' ? (
                <video
                  src={selectedMedia.item.url}
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={selectedMedia.item.url}
                  alt={`Media ${selectedMedia.index + 1}`}
                  className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubPhotoGallery; 