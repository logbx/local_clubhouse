import React from 'react';
import { CollaborationRequest, CollaborationStatus } from '../types/sponsor';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  ChatBubbleLeftIcon 
} from '@heroicons/react/24/outline';
import { sponsorApi } from '../services/sponsor.service';
import { toast } from 'react-toastify';

interface CollaborationRequestsListProps {
  requests: CollaborationRequest[];
  onRequestUpdate: () => void;
}

const CollaborationRequestsList: React.FC<CollaborationRequestsListProps> = ({ 
  requests, 
  onRequestUpdate 
}) => {
  const getStatusIcon = (status: CollaborationStatus) => {
    switch (status) {
      case CollaborationStatus.PENDING:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case CollaborationStatus.APPROVED:
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case CollaborationStatus.REJECTED:
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case CollaborationStatus.COMPLETED:
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: CollaborationStatus) => {
    switch (status) {
      case CollaborationStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case CollaborationStatus.APPROVED:
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case CollaborationStatus.REJECTED:
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case CollaborationStatus.COMPLETED:
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const handleStatusUpdate = async (requestId: string, status: CollaborationStatus) => {
    try {
      await sponsorApi.updateCollaborationRequest(requestId, { status });
      
      const statusText = status === CollaborationStatus.APPROVED ? 'approved' : 'rejected';
      toast.success(`Collaboration request ${statusText} successfully!`);
      
      onRequestUpdate();
    } catch (error: any) {
      console.error('Failed to update collaboration request:', error);
      toast.error(error.response?.data?.message || 'Failed to update collaboration request');
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <ChatBubbleLeftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No collaboration requests yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          When clubs send collaboration requests, they'll appear here.
        </p>
      </div>
    );
  }

  const pendingRequests = requests.filter(req => req.status === CollaborationStatus.PENDING);
  const otherRequests = requests.filter(req => req.status !== CollaborationStatus.PENDING);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Collaboration Requests ({requests.length})
      </h3>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-yellow-500" />
            Pending Requests ({pendingRequests.length})
          </h4>
          
          {pendingRequests.map((request) => (
            <div 
              key={request._id} 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {request.clubId.logoUrl ? (
                    <img 
                      src={request.clubId.logoUrl} 
                      alt={request.clubId.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-300">
                        {request.clubId.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">
                      {request.clubId.name}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      @{request.clubId.username}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(request.status)}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h6 className="font-medium text-gray-900 dark:text-white mb-2">
                  Collaboration Proposal:
                </h6>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {request.proposalText}
                </p>
              </div>

              {request.customMessage && (
                <div className="mb-4">
                  <h6 className="font-medium text-gray-900 dark:text-white mb-2">
                    Additional Message:
                  </h6>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {request.customMessage}
                  </p>
                </div>
              )}

              {/* Tier selection not implemented yet */}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Requested {formatMessageTimestamp(request.createdAt)}
                </p>
                
                {request.status === CollaborationStatus.PENDING && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusUpdate(request._id, CollaborationStatus.APPROVED)}
                      className="btn btn-primary btn-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(request._id, CollaborationStatus.REJECTED)}
                      className="btn btn-secondary btn-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other Requests */}
      {otherRequests.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            Previous Requests ({otherRequests.length})
          </h4>
          
          {otherRequests.map((request) => (
            <div 
              key={request._id} 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {request.clubId.logoUrl ? (
                    <img 
                      src={request.clubId.logoUrl} 
                      alt={request.clubId.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-300">
                        {request.clubId.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">
                      {request.clubId.name}
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      @{request.clubId.username}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(request.status)}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
                {request.proposalText}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Requested {formatMessageTimestamp(request.createdAt)}
                </span>
                {request.reviewedAt && (
                  <span>
                    {request.status === CollaborationStatus.APPROVED ? 'Approved' : 'Declined'} {formatMessageTimestamp(request.reviewedAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollaborationRequestsList; 