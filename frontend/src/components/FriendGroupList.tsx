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
  friends: { _id: string; fullName: string }[];
}

const FriendGroupList: React.FC<FriendGroupListProps> = ({ friends }) => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showChatId, setShowChatId] = useState<string | null>(null);
  const [addMembersGroupId, setAddMembersGroupId] = useState<string | null>(null);
  const [addMembers, setAddMembers] = useState<string[]>([]);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['friendGroups'],
    queryFn: friendGroupApi.getFriendGroups
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; members: string[] }) =>
      friendGroupApi.createFriendGroup(data.name, data.members),
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
    createGroupMutation.mutate({ name: newName, members: selectedMembers });
  };

  const handleAddMembers = (groupId: string) => {
    if (addMembers.length === 0) return;
    addMembersMutation.mutate({ groupId, userIds: addMembers });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Friend Groups</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Create Group'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name"
            className="w-full p-2 border rounded mb-2"
          />
          <select
            multiple
            value={selectedMembers}
            onChange={(e) => setSelectedMembers(Array.from(e.target.selectedOptions, o => o.value))}
            className="w-full p-2 border rounded mb-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            size={5}
          >
            {friends.map(friend => (
              <option key={friend._id} value={friend._id}>
                {friend.fullName}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || selectedMembers.length === 0}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Create Group
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="text-gray-500">No groups yet</p>
      ) : (
        <div className="space-y-2">
          {groups.map((group: FriendGroup) => {
            // Find friends not already in the group
            const groupMemberSet = new Set(group.members);
            const availableFriends = friends.filter(f => !groupMemberSet.has(f._id));
            return (
              <div
                key={group._id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <span className="font-medium">{group.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChatId(group._id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Open Chat
                  </button>
                  <button
                    onClick={() => {
                      setAddMembersGroupId(group._id);
                      setAddMembers([]);
                    }}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Add Members
                  </button>
                </div>
                {/* Add Members Modal */}
                {addMembersGroupId === group._id && (
                  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-2">Add Members to {group.name}</h3>
                      <select
                        multiple
                        value={addMembers}
                        onChange={e => setAddMembers(Array.from(e.target.selectedOptions, o => o.value))}
                        className="w-full p-2 border rounded mb-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        size={5}
                      >
                        {availableFriends.length === 0 ? (
                          <option disabled>No friends to add</option>
                        ) : (
                          availableFriends.map(friend => (
                            <option key={friend._id} value={friend._id}>{friend.fullName}</option>
                          ))
                        )}
                      </select>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAddMembers(group._id)}
                          disabled={addMembers.length === 0 || addMembersMutation.isPending}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddMembersGroupId(null)}
                          className="flex-1 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
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
        <div className="mt-4">
          <button
            onClick={() => setShowChatId(null)}
            className="mb-2 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Groups
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