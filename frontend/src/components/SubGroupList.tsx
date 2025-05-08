import React, { useEffect, useState } from 'react';
import { messageService } from '../services/message.service';
import SubGroupChat from './SubGroupChat';
import { useAuth } from '../context/AuthContext';

interface SubGroup {
  _id: string;
  name: string;
  members: string[];
  createdBy: string;
}

interface SubGroupListProps {
  eventId: string;
  isOrganizer: boolean;
  allUsers: { _id: string; fullName: string }[]; // for adding members
}

const SubGroupList: React.FC<SubGroupListProps> = ({ eventId, isOrganizer, allUsers }) => {
  const { user } = useAuth();
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [showChatId, setShowChatId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    messageService.getSubGroups(eventId)
      .then(setSubGroups)
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleCreate = async () => {
    if (!newName.trim() || selectedMembers.length === 0) return;
    setLoading(true);
    await messageService.createSubGroup(eventId, newName, selectedMembers);
    setNewName('');
    setSelectedMembers([]);
    setShowCreate(false);
    const updated = await messageService.getSubGroups(eventId);
    setSubGroups(updated);
    setLoading(false);
  };

  return (
    <div className="my-6">
      <h2 className="text-xl font-bold mb-2">Event Sub-Groups</h2>
      {isOrganizer && (
        <div className="mb-4">
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary mb-2">
            {showCreate ? 'Cancel' : 'Create Sub-Group'}
          </button>
          {showCreate && (
            <div className="bg-gray-50 p-4 rounded shadow mb-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Sub-group name"
                className="border rounded px-2 py-1 mr-2"
              />
              <select
                multiple
                value={selectedMembers}
                onChange={e => setSelectedMembers(Array.from(e.target.selectedOptions, o => o.value))}
                className="border rounded px-2 py-1"
              >
                {allUsers.map(u => (
                  <option key={u._id} value={u._id}>{u.fullName}</option>
                ))}
              </select>
              <button onClick={handleCreate} className="btn btn-success ml-2">Create</button>
            </div>
          )}
        </div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : subGroups.length === 0 ? (
        <div className="text-gray-500">No sub-groups yet.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {subGroups.map(sg => (
            <li key={sg._id} className="py-2 flex items-center justify-between">
              <span>{sg.name}</span>
              <button className="btn btn-secondary ml-2" onClick={() => setShowChatId(sg._id)}>
                Open Chat
              </button>
            </li>
          ))}
        </ul>
      )}
      {showChatId && (
        <div className="mt-4">
          <button className="btn btn-sm btn-secondary mb-2" onClick={() => setShowChatId(null)}>Back to Sub-Groups</button>
          <SubGroupChat subGroupId={showChatId} subGroupName={subGroups.find(sg => sg._id === showChatId)?.name || ''} />
        </div>
      )}
    </div>
  );
};

export default SubGroupList; 