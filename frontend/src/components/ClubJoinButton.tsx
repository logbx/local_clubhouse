import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { clubApi } from '../services/club.service';
import { MembershipStatus } from '../types/club';
import { UserPlusIcon, UserMinusIcon, StarIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

interface ClubJoinButtonProps {
  clubUsername: string;
  clubId?: string; // Optional club ID for join/leave operations
  onMembershipChange?: () => void;
}

const ClubJoinButton: React.FC<ClubJoinButtonProps> = ({ 
  clubUsername, 
  clubId,
  onMembershipChange 
}) => {
  const { user } = useAuth();
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>({
    isMember: false,
    isAdmin: false,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMembershipStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const status = await clubApi.getMembershipStatus(clubUsername);
      setMembershipStatus(status);
    } catch (err: any) {
      console.error('Failed to fetch membership status:', err);
      // If the endpoint doesn't exist or fails, assume not a member
      setMembershipStatus({ isMember: false, isAdmin: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembershipStatus();
  }, [clubUsername, user]);

  const handleJoinClub = async () => {
    if (!user) {
      toast.error('Please log in to join clubs');
      return;
    }

    if (!clubId) {
      toast.error('Club ID not available');
      return;
    }

    try {
      setActionLoading(true);
      await clubApi.joinClub(clubId);
      setMembershipStatus(prev => ({ ...prev, isMember: true }));
      toast.success('Successfully joined the club!');
      
      // Notify parent component of membership change
      onMembershipChange?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to join club');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!confirm('Are you sure you want to leave this club?')) {
      return;
    }

    if (!clubId) {
      toast.error('Club ID not available');
      return;
    }

    try {
      setActionLoading(true);
      await clubApi.leaveClub(clubId);
      setMembershipStatus({ isMember: false, isAdmin: false });
      toast.success('Successfully left the club');
      
      // Notify parent component of membership change
      onMembershipChange?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to leave club');
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <button
        onClick={() => toast.info('Please log in to join clubs')}
        className="btn btn-primary flex items-center gap-2"
      >
        <UserPlusIcon className="h-4 w-4" />
        Join Club
      </button>
    );
  }

  if (loading) {
    return (
      <div className="btn btn-primary opacity-50 cursor-not-allowed">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {membershipStatus.isMember ? (
        <>
          <button
            onClick={handleLeaveClub}
            disabled={actionLoading}
            className="btn btn-secondary flex items-center gap-2"
          >
            <UserMinusIcon className="h-4 w-4" />
            {actionLoading ? 'Leaving...' : 'Leave Club'}
          </button>
          
          {membershipStatus.isAdmin && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 rounded-full text-sm font-medium flex items-center gap-1">
              <StarIcon className="h-3 w-3" />
              Admin
            </span>
          )}
        </>
      ) : (
        <button
          onClick={handleJoinClub}
          disabled={actionLoading}
          className="btn btn-primary flex items-center gap-2"
        >
          <UserPlusIcon className="h-4 w-4" />
          {actionLoading ? 'Joining...' : 'Join Club'}
        </button>
      )}
    </div>
  );
};

export default ClubJoinButton; 