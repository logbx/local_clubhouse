import React, { useState } from 'react';
import { ClubComment } from '../types/club';
import { clubApi } from '../services/club.service';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { toast } from 'react-toastify';
import { 
  TrashIcon, 
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';

interface ClubCommentModeratorProps {
  clubUsername: string;
  comments: ClubComment[];
  onCommentDeleted: () => void;
}

const ClubCommentModerator: React.FC<ClubCommentModeratorProps> = ({ 
  clubUsername, 
  comments, 
  onCommentDeleted 
}) => {
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(new Set());

  const handleDeleteComment = async (commentId: string, authorName: string) => {
    if (!confirm(`Are you sure you want to delete the comment by ${authorName}?`)) {
      return;
    }

    try {
      setDeletingCommentIds(prev => new Set(prev).add(commentId));
      await clubApi.deleteComment(clubUsername, commentId);
      toast.success('Comment deleted successfully');
      onCommentDeleted();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete comment');
    } finally {
      setDeletingCommentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  };

  if (comments.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
        <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Comments Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Public comments will appear here for moderation.
        </p>
      </div>
    );
  }

  const sortedComments = [...comments].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Comment Moderation
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              These are public comments visible to all visitors. Use moderation responsibly and follow community guidelines.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Public Comments ({comments.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedComments.map((comment) => (
            <div key={comment._id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Comment Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-300 font-medium text-sm">
                            {comment.authorName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {comment.authorName}
                        </p>
                        {comment.authorEmail && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {comment.authorEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatMessageTimestamp(comment.createdAt)}
                      </span>
                      <button
                        onClick={() => handleDeleteComment(comment._id!, comment.authorName)}
                        disabled={deletingCommentIds.has(comment._id!)}
                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete comment"
                      >
                        {deletingCommentIds.has(comment._id!) ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="mt-2">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Guidelines */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Moderation Guidelines
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Delete comments that contain spam, harassment, or inappropriate content</li>
          <li>• Remove comments that violate Local Clubhouse community guidelines</li>
          <li>• Keep discussions on-topic and relevant to your club</li>
          <li>• Consider warning users before deleting their comments when appropriate</li>
        </ul>
      </div>
    </div>
  );
};

export default ClubCommentModerator; 