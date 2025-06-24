import React, { useState, useEffect } from 'react';
import { InstagramService, InstagramPost } from '../services/instagram.service';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { LoadingSpinner } from './LoadingSpinner';
import { 
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface InstagramFeedProps {
  handle: string;
  maxPosts?: number;
}

const InstagramFeed: React.FC<InstagramFeedProps> = ({ handle, maxPosts = 6 }) => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const instagramPosts = await InstagramService.getInstagramPosts(handle);
        setPosts(instagramPosts.slice(0, maxPosts));
      } catch (err) {
        setError('Failed to load Instagram posts');
        console.error('Instagram fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (handle && handle.trim()) {
      fetchPosts();
    } else {
      setLoading(false);
    }
  }, [handle, maxPosts]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || posts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400">
          {error || 'No Instagram posts available'}
        </div>
      </div>
    );
  }

  const profileUrl = InstagramService.getInstagramProfileUrl(handle);

  return (
    <div className="space-y-6">
      {/* Instagram Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full p-0.5">
            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                📷
              </span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              @{InstagramService.formatInstagramHandle(handle)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Latest from Instagram
            </p>
          </div>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 text-sm font-medium"
        >
          <span>Follow on Instagram</span>
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </a>
      </div>

      {/* Instagram Posts Grid - Clean style like Old Man Run Club */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="group relative overflow-hidden rounded-lg aspect-square"
          >
            <img
              src={post.media_url}
              alt="Instagram post"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ArrowTopRightOnSquareIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            
            {/* Click overlay */}
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0"
              aria-label="View Instagram post"
            />
          </div>
        ))}
      </div>

      {/* View More Link */}
      {posts.length === maxPosts && (
        <div className="text-center">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            <span>View More on Instagram</span>
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
};

export default InstagramFeed; 