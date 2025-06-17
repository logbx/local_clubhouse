import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendGroupApi } from '../services/api';
import FriendGroupChat from './FriendGroupChat';

interface FriendGroup {
  _id: string;
  name: string;
  members: string[];
  createdBy: string;
}

interface FriendGroupListProps {
  friends: { _id: string; username: string }[];
  selectedGroupId?: string | null;
}

const FriendGroupList: React.FC<FriendGroupListProps> = ({ friends, selectedGroupId }) => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showChatId, setShowChatId] = useState<string | null>(selectedGroupId || null);
  const [addMembersGroupId, setAddMembersGroupId] = useState<string | null>(null);
  const [addMembers, setAddMembers] = useState<string[]>([]);

  // Update showChatId when selectedGroupId changes
  useEffect(() => {
    if (selectedGroupId) {
      setShowChatId(selectedGroupId);
    }
  }, [selectedGroupId]);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['friendGroups'],
    queryFn: friendGroupApi.getFriendGroups
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: { username: string; members: string[] }) =>
      friendGroupApi.createFriendGroup(data.username, data.members),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendGroups'] });
      setShowCreate(false);
      setNewName('');
      setSelectedMembers([]);
    }
  });

  const addMembersMutation = useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: string; userIds: string[] }) => {
      for (const userId of userIds) {
        await friendGroupApi.addFriendGroupMember(groupId, userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendGroups'] });
      setAddMembersGroupId(null);
      setAddMembers([]);
    }
  });

  const handleCreate = () => {
    if (!newName.trim() || selectedMembers.length === 0) return;
    createGroupMutation.mutate({ username: newName, members: selectedMembers });
  };

  const handleAddMembers = (groupId: string) => {
    if (addMembers.length === 0) return;
    addMembersMutation.mutate({ groupId, userIds: addMembers });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Friend Groups</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
        >
          {showCreate ? 'Cancel' : 'Create Group'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
          />
          <select
            multiple
            value={selectedMembers}
            onChange={(e) => setSelectedMembers(Array.from(e.target.selectedOptions, o => o.value))}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
            size={5}
          >
            {friends.map(friend => (
              <option key={friend._id} value={friend._id} className="p-2">
                {friend.username}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || selectedMembers.length === 0 || createGroupMutation.isPending}
            className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No groups yet. Create your first group!</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group: FriendGroup) => {
            // Find friends not already in the group
            const groupMemberSet = new Set(group.members);
            const availableFriends = friends.filter(f => !groupMemberSet.has(f._id));
            return (
              <div
                key={group._id}
                className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-white">{group.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChatId(group._id)}
                    className="px-3 py-1 bg-primary-500 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-700 transition-colors text-sm"
                  >
                    Open Chat
                  </button>
                  <button
                    onClick={() => {
                      setAddMembersGroupId(group._id);
                      setAddMembers([]);
                    }}
                    className="px-3 py-1 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors text-sm"
                  >
                    Add Members
                  </button>
                </div>
                {/* Add Members Modal */}
                {addMembersGroupId === group._id && (
                  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4">
                      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Members to {group.name}</h3>
                      <select
                        multiple
                        value={addMembers}
                        onChange={e => setAddMembers(Array.from(e.target.selectedOptions, o => o.value))}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
                        size={5}
                      >
                        {availableFriends.length === 0 ? (
                          <option disabled className="text-gray-500 dark:text-gray-400">No friends to add</option>
                        ) : (
                          availableFriends.map(friend => (
                            <option key={friend._id} value={friend._id} className="p-2">{friend.username}</option>
                          ))
                        )}
                      </select>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAddMembers(group._id)}
                          disabled={addMembers.length === 0 || addMembersMutation.isPending}
                          className="flex-1 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {addMembersMutation.isPending ? 'Adding...' : 'Add'}
                        </button>
                        <button
                          onClick={() => setAddMembersGroupId(null)}
                          className="flex-1 px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showChatId && (
        <div className="mt-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-4">
          <button
            onClick={() => setShowChatId(null)}
            className="mb-4 px-3 py-1 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            ← Back to Groups
          </button>
          <FriendGroupChat
            groupId={showChatId}
            groupName={groups.find((g: FriendGroup) => g._id === showChatId)?.name || ''}
          />
        </div>
      )}
    </div>
  );
};

export default FriendGroupList; 