import React, { useState, useEffect } from 'react';
import { Sponsor, TeamMember } from '../types/sponsor';
import { sponsorApi } from '../services/sponsor.service';
import { 
  UserPlusIcon, 
  UserIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  UsersIcon,
  UserGroupIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { LoadingSpinner } from './LoadingSpinner';

interface SponsorTeamManagerProps {
  sponsor: Sponsor;
  onTeamUpdate: () => void;
}

const SponsorTeamManager: React.FC<SponsorTeamManagerProps> = ({ sponsor, onTeamUpdate }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Team roles
  const teamRoles = [
    'Marketing Manager',
    'Event Coordinator',
    'Communications Specialist',
    'Business Development',
    'Creative Director',
    'Account Manager',
    'Social Media Manager',
    'Partnership Manager',
    'Customer Success',
    'Operations Manager'
  ];

  useEffect(() => {
    fetchTeamMembers();
  }, [sponsor._id]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const members = await sponsorApi.getTeamMembers(sponsor._id);
      
      // Add the sponsor owner/leader as the first member
      const leaderMember: TeamMember = {
        _id: 'leader',
        userId: sponsor.createdBy,
        role: 'Sponsor Leader',
        permissions: ['all'],
        joinedAt: sponsor.createdAt,
        isActive: true,
        invitedBy: sponsor.createdBy
      };
      
      // Combine leader with team members
      setTeamMembers([leaderMember, ...members]);
    } catch (error: any) {
      console.error('Failed to fetch team members:', error);
      toast.error('Failed to load team members');
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail || !newMemberRole) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      await sponsorApi.addTeamMember(sponsor._id, {
        email: newMemberEmail,
        role: newMemberRole
      });

      setNewMemberEmail('');
      setNewMemberRole('');
      setShowAddForm(false);
      
      toast.success('Team member added successfully! They will receive an invitation email.');
      await fetchTeamMembers();
      onTeamUpdate();
    } catch (error: any) {
      console.error('Failed to add team member:', error);
      toast.error(error.response?.data?.message || 'Failed to add team member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      await sponsorApi.removeTeamMember(sponsor._id, memberId);
      toast.success('Team member removed successfully');
      await fetchTeamMembers();
      onTeamUpdate();
    } catch (error: any) {
      console.error('Failed to remove team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      await sponsorApi.updateTeamMember(sponsor._id, memberId, { role: newRole });
      toast.success('Team member role updated successfully');
      await fetchTeamMembers();
      onTeamUpdate();
    } catch (error: any) {
      console.error('Failed to update team member role:', error);
      toast.error('Failed to update team member role');
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.userId.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.userId.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Team Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your team members who can access internal communications
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <UserPlusIcon className="h-4 w-4" />
          Add Team Member
        </button>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Team Member</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Enter team member's email"
                className="input w-full"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                They will receive an invitation to join your sponsor team
              </p>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role *
              </label>
              <select
                id="role"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="input w-full"
                required
              >
                <option value="">Select a role</option>
                {teamRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Add Member
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search team members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamMembers.length}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamMembers.length - 1}</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {teamMembers.filter(m => m.isActive).length}
              </p>
            </div>
            <CheckIcon className="h-8 w-8 text-emerald-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(teamMembers.map(m => m.role)).size}
              </p>
            </div>
            <CogIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Team Members ({filteredMembers.length})
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Including sponsor leader and {filteredMembers.length - 1} team member{filteredMembers.length - 1 !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No team members found
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No team members match your current filters.'
                  : 'You haven\'t added any team members yet. Start by inviting someone to join your team!'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-primary"
                >
                  Add First Team Member
                </button>
              )}
            </div>
          ) : filteredMembers.length === 1 && filteredMembers[0]._id === 'leader' ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Only you as the leader
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You're currently the only member of this sponsor team. Add team members to help manage your sponsorship activities and communications.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn btn-primary"
              >
                Add Team Members
              </button>
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div key={member._id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {member.userId.profileImage ? (
                      <img
                        src={member.userId.profileImage}
                        alt={member.userId.fullName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                          {member.userId.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Leader Crown */}
                    {member._id === 'leader' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        <span className="text-xs">👑</span>
                      </div>
                    )}
                    {/* Active Status */}
                    {member._id !== 'leader' && (
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                        member.isActive ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {member.userId.fullName}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        @{member.userId.username}
                      </span>
                      {member._id === 'leader' && (
                        <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 px-2 py-1 rounded-full text-xs font-medium">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {member._id === 'leader' ? (
                        <span className="text-sm bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded px-2 py-1 text-yellow-700 dark:text-yellow-300 font-medium">
                          Sponsor Leader
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                          className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-300"
                        >
                          {teamRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {member._id === 'leader' ? 'Founded' : 'Joined'} {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Remove Button - Hidden for Leader */}
                {member._id !== 'leader' && (
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Remove team member"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Team Management</p>
            <p>
              The sponsor leader (👑) has full permissions and cannot be removed. Team members can be assigned different roles with specific permissions. Active members have access to team communications and sponsor resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SponsorTeamManager; 