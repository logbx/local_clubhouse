import React, { useEffect, useState } from 'react';
import { eventSubGroupApi, friendApi } from '../services/api';
import SubGroupChat from './SubGroupChat';
import { useAuth } from '../context/AuthContext';
import { SubGroup } from '../types/event';
import { AxiosResponse } from 'axios';

interface SubGroupListProps {
  eventId: string;
  isOrganizer: boolean;
}

interface SubGroupResponse {
  data: SubGroup[];
}

const SubGroupList: React.FC<SubGroupListProps> = ({ eventId, isOrganizer }) => {
  const { user } = useAuth();
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [showChatId, setShowChatId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSubGroupName, setNewSubGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingSubGroup, setEditingSubGroup] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [friends, setFriends] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => {
    if (!eventId || eventId === 'undefined') {
      console.warn('SubGroupList: Invalid eventId provided:', eventId);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Fetch both sub-groups and friends
    Promise.all([
      eventSubGroupApi.getSubGroups(eventId),
      friendApi.getFriends()
    ])
      .then(([subGroupResponse, friendsResponse]) => {
        // Handle sub-groups response and normalize IDs
        const subGroupData = subGroupResponse?.data || subGroupResponse || [];
        console.log('[DEBUG] Raw sub-group data received:', subGroupData);
        const normalizedSubGroups = Array.isArray(subGroupData) ? subGroupData.map((group: any) => ({
          ...group,
          id: group._id || group.id
        })) : [];
        console.log('[DEBUG] Normalized sub-groups:', normalizedSubGroups);
        setSubGroups(normalizedSubGroups);
        
        // Handle friends response
        const friendsData = friendsResponse?.friends || friendsResponse || [];
        setFriends(Array.isArray(friendsData) ? friendsData.map((friend: any) => ({
          id: friend._id || friend.id,
          username: friend.username || 'Unknown User'
        })) : []);
      })
      .catch((err: Error) => {
        console.error('Error fetching data:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleCreate = async () => {
    if (!eventId || eventId === 'undefined') {
      console.error('Cannot create sub-group: Invalid eventId');
      return;
    }
    if (!newName.trim() || selectedMembers.length === 0) return;
    setLoading(true);
    try {
      await eventSubGroupApi.createSubGroup(eventId, newName, selectedMembers);
      setNewName('');
      setSelectedMembers([]);
      setShowCreate(false);
      const response = await eventSubGroupApi.getSubGroups(eventId);
      const subGroupData = response.data?.data || response.data || [];
      setSubGroups(Array.isArray(subGroupData) ? subGroupData : []);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred while creating the sub-group');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubGroup = async () => {
    if (!eventId || eventId === 'undefined') {
      console.error('Cannot create sub-group: Invalid eventId');
      return;
    }
    if (!newSubGroupName.trim()) return;
    setIsCreating(true);
    try {
      await eventSubGroupApi.createSubGroup(eventId, newSubGroupName, selectedMembers);
      const response = await eventSubGroupApi.getSubGroups(eventId);
      const subGroupData = response.data?.data || response.data || [];
      const normalizedSubGroups = Array.isArray(subGroupData) ? subGroupData.map((group: any) => ({
        ...group,
        id: group._id || group.id
      })) : [];
      setSubGroups(normalizedSubGroups);
      setNewSubGroupName('');
      setSelectedMembers([]);
      setShowCreate(false);
    } catch (error) {
      console.error('Error creating sub-group:', error);
      setError('An error occurred while creating the sub-group.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateSubGroup = async (subGroupId: string) => {
    if (!eventId || eventId === 'undefined') {
      console.error('Cannot update sub-group: Invalid eventId');
      return;
    }
    if (!editingName.trim()) return;
    setIsCreating(true);
    try {
      await eventSubGroupApi.updateSubGroup(subGroupId, editingName);
      const response = await eventSubGroupApi.getSubGroups(eventId);
      const subGroupData = response.data?.data || response.data || [];
      const normalizedSubGroups = Array.isArray(subGroupData) ? subGroupData.map((group: any) => ({
        ...group,
        id: group._id || group.id
      })) : [];
      setSubGroups(normalizedSubGroups);
      setEditingSubGroup(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating sub-group:', error);
      setError('An error occurred while updating the sub-group.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSubGroup = async (subGroupId: string) => {
    if (!eventId || eventId === 'undefined') {
      console.error('Cannot delete sub-group: Invalid eventId');
      return;
    }
    setIsCreating(true);
    try {
      await eventSubGroupApi.deleteSubGroup(subGroupId);
      const response = await eventSubGroupApi.getSubGroups(eventId);
      const subGroupData = response.data?.data || response.data || [];
      const normalizedSubGroups = Array.isArray(subGroupData) ? subGroupData.map((group: any) => ({
        ...group,
        id: group._id || group.id
      })) : [];
      setSubGroups(normalizedSubGroups);
    } catch (error) {
      console.error('Error deleting sub-group:', error);
      setError('An error occurred while deleting the sub-group.');
    } finally {
      setIsCreating(false);
    }
  };

  // Don't render anything if eventId is invalid
  if (!eventId || eventId === 'undefined') {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-400">Sub-groups unavailable - invalid event ID</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
      
      {loading ? (
        <div>Loading sub-groups...</div>
      ) : (
        <>
          {subGroups.map(group => (
            <div key={group.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{group.name}</h3>
                <div className="space-x-2">
                  <button
                    onClick={() => setShowChatId(showChatId === group.id ? null : group.id)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {showChatId === group.id ? 'Hide Chat' : 'Show Chat'}
                  </button>
                  {isOrganizer && (
                    <>
                      <button
                        onClick={() => {
                          setEditingSubGroup(group.id);
                          setEditingName(group.name);
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubGroup(group.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {editingSubGroup === group.id ? (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 border rounded px-2 py-1"
                    placeholder="New group name"
                  />
                  <button
                    onClick={() => handleUpdateSubGroup(group.id)}
                    disabled={isCreating}
                    className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingSubGroup(null);
                      setEditingName('');
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-1 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  {group.members.length} members
                </div>
              )}
              
              {showChatId === group.id && (
                <SubGroupChat subGroupId={group.id} subGroupName={group.name} />
              )}
            </div>
          ))}
          
          {isOrganizer && (
            <div className="mt-4">
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Create New Sub-group
              </button>
              
              {showCreate && (
                <div className="mt-4 space-y-4 border rounded-lg p-4">
                  <input
                    type="text"
                    value={newSubGroupName}
                    onChange={(e) => setNewSubGroupName(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Sub-group name"
                  />
                  
                  <div>
                    <h4 className="font-medium mb-2">Select Friends to Add:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {friends.map((friend: { id: string; username: string }, index: number) => (
                        <div key={`friend-${friend.id || index}`} className="flex items-center">
                          <input
                            type="checkbox"
                            id={friend.id}
                            checked={selectedMembers.includes(friend.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMembers([...selectedMembers, friend.id]);
                              } else {
                                setSelectedMembers(selectedMembers.filter(id => id !== friend.id));
                              }
                            }}
                            className="mr-2"
                          />
                          <label htmlFor={friend.id}>{friend.username}</label>
                        </div>
                      ))}
                    </div>
                    {friends.length === 0 && (
                      <p className="text-gray-500 text-sm">You don't have any friends yet. Connect with other users to add them to sub-groups!</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setNewSubGroupName('');
                        setSelectedMembers([]);
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSubGroup}
                      disabled={isCreating || !newSubGroupName.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SubGroupList; 