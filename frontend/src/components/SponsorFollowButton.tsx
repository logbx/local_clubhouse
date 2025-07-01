import React, { useState } from 'react';
import { sponsorApi } from '../services/sponsor.service';
import { PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

interface SponsorFollowButtonProps {
  sponsorId: string;
  onFollowChange?: () => void;
}

const SponsorFollowButton: React.FC<SponsorFollowButtonProps> = ({ 
  sponsorId, 
  onFollowChange 
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    try {
      setLoading(true);
      await sponsorApi.followSponsor(sponsorId);
      setIsFollowing(true);
      toast.success('Following sponsor!');
      onFollowChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to follow sponsor');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    try {
      setLoading(true);
      await sponsorApi.unfollowSponsor(sponsorId);
      setIsFollowing(false);
      toast.success('Unfollowed sponsor');
      onFollowChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unfollow sponsor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={isFollowing ? handleUnfollow : handleFollow}
      disabled={loading}
      className={`btn flex items-center gap-2 ${
        isFollowing 
          ? 'btn-secondary' 
          : 'btn-primary'
      }`}
    >
      {loading ? (
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      ) : isFollowing ? (
        <CheckIcon className="h-4 w-4" />
      ) : (
        <PlusIcon className="h-4 w-4" />
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
};

export default SponsorFollowButton; 