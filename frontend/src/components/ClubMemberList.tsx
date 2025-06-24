import React, { useState, useEffect } from 'react';
import { clubApi } from '../services/club.service';
import { ClubMember, UpdateMemberRoleDto, Club } from '../types/club';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  UserIcon,
  StarIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  UserPlusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';

interface ClubMemberListProps {
  clubUsername: string;
  isAdmin: boolean;
  club?: Club; // Optional club data to identify founder
}

const ClubMemberList: React.FC<ClubMemberListProps> = ({ clubUsername, isAdmin, club }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const clubMembers = await clubApi.getClubMembers(clubUsername);
      setMembers(clubMembers);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch club members:', err);
      setError(err.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [clubUsername, isAdmin]);

  // Helper function to check if a member is the club founder
  const isClubFounder = (memberId: string): boolean => {
    if (!club) return false;
    return club.club_founder?._id === memberId || club.createdBy._id === memberId;
  };

  // Helper function to get member display role and styling
  const getMemberRoleInfo = (member: ClubMember) => {
    const isFounder = isClubFounder(member.userId._id);
    
    if (isFounder) {
      return {
        displayText: 'Club Founder',
        icon: <ShieldCheckIcon className="h-4 w-4 text-yellow-600" title="Club Founder" />,
        badgeClasses: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
        canModify: false // Founders cannot be demoted
      };
    } else if (member.role === 'admin') {
      return {
        displayText: 'Admin',
        icon: <StarIcon className="h-4 w-4 text-yellow-500" title="Admin" />,
        badgeClasses: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
        canModify: true
      };
    } else {
      return {
        displayText: 'Member',
        icon: null,
        badgeClasses: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        canModify: true
      };
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member') => {
    // Prevent modifying founder role
    if (isClubFounder(memberId)) {
      toast.error('Cannot modify club founder role');
      return;
    }

    try {
      setActionLoading(memberId);
      const updateData: UpdateMemberRoleDto = { userId: memberId, role: newRole };
      await clubApi.updateMemberRole(clubUsername, updateData);
      
      // Update local state
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.userId._id === memberId 
            ? { ...member, role: newRole }
            : member
        )
      );
      
      toast.success(`Member role updated to ${newRole}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update member role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    // Prevent removing founder
    if (isClubFounder(memberId)) {
      toast.error('Cannot remove club founder');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${memberName} from the club?`)) {
      return;
    }

    try {
      setActionLoading(memberId);
      await clubApi.removeMember(clubUsername, memberId);
      
      // Update local state
      setMembers(prevMembers => prevMembers.filter(member => member.userId._id !== memberId));
      
      toast.success('Member removed from club');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <UserIcon className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Admin Access Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Only club admins can view and manage the member list.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Error Loading Members
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={fetchMembers} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Club Members ({members.length})
          </h3>
          <UserPlusIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Members List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {members.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No members found.
            </p>
          </div>
        ) : (
          members
            .sort((a, b) => {
              // Sort by founder first, then admin, then by name
              const aIsFounder = isClubFounder(a.userId._id);
              const bIsFounder = isClubFounder(b.userId._id);
              
              if (aIsFounder && !bIsFounder) return -1;
              if (!aIsFounder && bIsFounder) return 1;
              
              if (a.role !== b.role) {
                return a.role === 'admin' ? -1 : 1;
              }
              return a.userId.fullName.localeCompare(b.userId.fullName);
            })
            .map((member) => {
              const roleInfo = getMemberRoleInfo(member);
              
              return (
                <div key={member.userId._id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {member.userId.profileImage ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={member.userId.profileImage}
                            alt={member.userId.fullName}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-300 font-medium text-sm">
                              {member.userId.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Member Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {member.userId.fullName}
                          </p>
                          {roleInfo.icon}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{member.userId.username} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${roleInfo.badgeClasses}`}>
                        {roleInfo.displayText}
                      </span>

                      {/* Only show actions for other members, not yourself, and only if they can be modified */}
                      {member.userId._id !== user?.id && roleInfo.canModify && (
                        <Menu as="div" className="relative">
                          <Menu.Button
                            disabled={actionLoading === member.userId._id}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <EllipsisVerticalIcon className="h-4 w-4 text-gray-400" />
                          </Menu.Button>

                          <Transition
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() =>
                                      handleUpdateRole(
                                        member.userId._id,
                                        member.role === 'admin' ? 'member' : 'admin'
                                      )
                                    }
                                    className={`${
                                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                    } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300`}
                                  >
                                    <StarIcon className="mr-3 h-4 w-4" />
                                    {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() =>
                                      handleRemoveMember(member.userId._id, member.userId.fullName)
                                    }
                                    className={`${
                                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                    } group flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                                  >
                                    <TrashIcon className="mr-3 h-4 w-4" />
                                    Remove Member
                                  </button>
                                )}
                              </Menu.Item>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      )}
                    </div>
                  </div>

                  {/* Loading overlay for this member */}
                  {actionLoading === member.userId._id && (
                    <div className="absolute inset-0 bg-white bg-opacity-50 dark:bg-gray-800 dark:bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

export default ClubMemberList; 