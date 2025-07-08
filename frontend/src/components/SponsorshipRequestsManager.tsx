import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventApi } from '../services/api';
import { Event } from '../types/event';
import { Sponsor } from '../types/sponsor';
import { LoadingSpinner } from './LoadingSpinner';
import { 
  CheckIcon, 
  XMarkIcon, 
  ClockIcon, 
  CalendarIcon,
  MapPinIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

interface SponsorshipRequestsManagerProps {
  sponsor: Sponsor;
}

interface SponsorshipRequest {
  event: Event;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

const SponsorshipRequestsManager: React.FC<SponsorshipRequestsManagerProps> = ({ sponsor }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SponsorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchSponsorshipRequests();
  }, [sponsor._id]);

  const fetchSponsorshipRequests = async () => {
    try {
      setLoading(true);
      const events = await eventApi.getEvents();
      
      const sponsorshipRequests: SponsorshipRequest[] = [];
      
      events.forEach((event: Event) => {
        if (event.sponsors) {
          event.sponsors.forEach((sponsorRequest: any) => {
            if (typeof sponsorRequest === 'object') {
              const sponsorData = sponsorRequest.sponsorId;
              const sponsorId = typeof sponsorData === 'string' ? sponsorData : sponsorData._id;
              
              if (sponsorId === sponsor._id) {
                sponsorshipRequests.push({
                  event,
                  status: sponsorRequest.status,
                  requestedAt: sponsorRequest.requestedAt,
                  respondedAt: sponsorRequest.respondedAt
                });
              }
            }
          });
        }
      });

      // Sort by request date (newest first)
      sponsorshipRequests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );

      setRequests(sponsorshipRequests);
    } catch (error) {
      console.error('Failed to fetch sponsorship requests:', error);
      toast.error('Failed to load sponsorship requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      setProcessing(eventId);
      await eventApi.approveSponsorshipRequest(eventId, sponsor._id);
      toast.success('Sponsorship request approved!');
      await fetchSponsorshipRequests();
    } catch (error: any) {
      console.error('Failed to approve sponsorship:', error);
      toast.error('Failed to approve sponsorship request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (eventId: string) => {
    try {
      setProcessing(eventId);
      await eventApi.rejectSponsorshipRequest(eventId, sponsor._id);
      toast.success('Sponsorship request rejected');
      await fetchSponsorshipRequests();
    } catch (error: any) {
      console.error('Failed to reject sponsorship:', error);
      toast.error('Failed to reject sponsorship request');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            <ClockIcon className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
            <CheckIcon className="h-3 w-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
            <XMarkIcon className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Sponsorship Requests</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage sponsorship requests for your events
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No sponsorship requests
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You haven't received any sponsorship requests yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.event.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {request.event.title}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {request.event.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{format(new Date(request.event.startDate), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{request.event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      <span>Requested {format(new Date(request.requestedAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  {request.event.clubName && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                      <BuildingOfficeIcon className="h-4 w-4" />
                      <span>Organized by {request.event.clubName}</span>
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(request.event.id)}
                      disabled={processing === request.event.id}
                      className="btn btn-success flex items-center gap-2 px-4 py-2"
                    >
                      <CheckIcon className="h-4 w-4" />
                      {processing === request.event.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(request.event.id)}
                      disabled={processing === request.event.id}
                      className="btn btn-danger flex items-center gap-2 px-4 py-2"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      {processing === request.event.id ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SponsorshipRequestsManager; 