import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { clubApi } from '../services/club.service';
import { ClubMember, CreateClubGroupChatDto } from '../types/club';
import { toast } from 'react-toastify';

interface CreateGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubUsername: string;
  onGroupChatCreated: () => void;
}

const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({
  isOpen,
  onClose,
  clubUsername,
  onGroupChatCreated,
}) => {
  const [formData, setFormData] = useState<CreateClubGroupChatDto>({
    name: '',
    description: '',
    members: [],
  });
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchClubMembers();
    }
  }, [isOpen, clubUsername]);

  const fetchClubMembers = async () => {
    try {
      setLoadingMembers(true);
      const members = await clubApi.getClubMembers(clubUsername);
      setClubMembers(members);
    } catch (error) {
      console.error('Failed to fetch club members:', error);
      toast.error('Failed to load club members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Group chat name is required');
      return;
    }

    try {
      setLoading(true);
      const groupChatData = {
        ...formData,
        members: selectedMembers,
      };
      
      await clubApi.createGroupChat(clubUsername, groupChatData);
      toast.success('Group chat created successfully!');
      onGroupChatCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create group chat:', error);
      toast.error(error.response?.data?.message || 'Failed to create group chat');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', members: [] });
    setSelectedMembers([]);
    onClose();
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <UsersIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create Group Chat
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Start a focused discussion group
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Group Chat Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group Chat Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Training Group, Social Events, etc."
              maxLength={50}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="What is this group chat for?"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Members (Optional)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              You can add members now or later. You'll be added automatically.
            </p>
            
            {loadingMembers ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                {clubMembers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No other members to add
                  </div>
                ) : (
                  clubMembers.map((member) => (
                    <div
                      key={member.userId._id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center space-x-3">
                        {member.userId.profileImage ? (
                          <img
                            src={member.userId.profileImage}
                            alt={member.userId.fullName}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {member.userId.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.userId.fullName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            @{member.userId.username}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMemberSelection(member.userId._id)}
                        className={`p-1 rounded-full transition-colors ${
                          selectedMembers.includes(member.userId._id)
                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                        }`}
                      >
                        <UserPlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {selectedMembers.length > 0 && (
              <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Group Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupChatModal; 