import React, { useState } from 'react';
import { TournamentMatch } from '../services/tournament.service';

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch;
  currentUserId: string;
  isCreator: boolean;
  onSubmitResult: (winnerId: string, loserId: string, notes?: string) => Promise<void>;
  onConfirmResult: () => Promise<void>;
  onDisputeResult: (reason: string) => Promise<void>;
  onResolveDispute: (winnerId: string, loserId: string, notes?: string) => Promise<void>;
  onForfeit: (forfeitingPlayerId: string) => Promise<void>;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  isOpen,
  onClose,
  match,
  currentUserId,
  isCreator,
  onSubmitResult,
  onConfirmResult,
  onDisputeResult,
  onResolveDispute,
  onForfeit,
}) => {
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  // Debug logging when modal opens
  React.useEffect(() => {
    if (isOpen) {
      console.log('🎯 MatchResultModal opened with data:', {
        currentUserId,
        isCreator,
        match: {
          matchId: match.matchId,
          status: match.status,
          roundNumber: match.roundNumber,
          player1: {
            id: match.player1.id,
            userId: match.player1.userId,
            name: match.player1.name,
            fullName: match.player1.fullName,
            isGuest: match.player1.isGuest
          },
          player2: {
            id: match.player2.id,
            userId: match.player2.userId,
            name: match.player2.name,
            fullName: match.player2.fullName,
            isGuest: match.player2.isGuest
          },
          resultReportedBy: match.resultReportedBy,
          winnerId: match.winnerId,
          loserId: match.loserId
        }
      });
    }
  }, [isOpen, match, currentUserId, isCreator]);

  if (!isOpen) return null;

  const isPlayer1 = match.player1.userId === currentUserId;
  const isPlayer2 = match.player2.userId === currentUserId;
  const isParticipant = isPlayer1 || isPlayer2;
  const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
  const bothGuests = match.player1.isGuest && match.player2.isGuest;

  // Determine what actions are available
  const canSubmitResult = () => {
    console.log('🔍 DEBUG canSubmitResult:', {
      matchStatus: match.status,
      bothGuests,
      hasGuestPlayer,
      isCreator,
      currentUserId,
      isParticipant,
      player1: { 
        id: match.player1.id, 
        userId: match.player1.userId, 
        isGuest: match.player1.isGuest,
        name: match.player1.name 
      },
      player2: { 
        id: match.player2.id, 
        userId: match.player2.userId, 
        isGuest: match.player2.isGuest,
        name: match.player2.name 
      },
      matchData: match
    });
    
    if (match.status !== 'pending') {
      console.log('❌ Cannot submit: match status is not pending:', match.status);
      return false;
    }
    
    // Both guests: Only tournament creator can submit
    if (bothGuests) {
      console.log('👥 Both guests detected, only creator can submit. isCreator:', isCreator);
      return isCreator;
    }
    
    // One guest: Registered player OR tournament creator can submit
    if (hasGuestPlayer) {
      const player1Match = !match.player1.isGuest && match.player1.userId === currentUserId;
      const player2Match = !match.player2.isGuest && match.player2.userId === currentUserId;
      const result = isCreator || player1Match || player2Match;
      
      console.log('👤 One guest detected:', {
        isCreator,
        player1Match: {
          isNotGuest: !match.player1.isGuest,
          userIdMatch: match.player1.userId === currentUserId,
          result: player1Match
        },
        player2Match: {
          isNotGuest: !match.player2.isGuest,
          userIdMatch: match.player2.userId === currentUserId,
          result: player2Match
        },
        finalResult: result
      });
      
      return result;
    }
    
    // Both registered: Either participant can submit
    console.log('👥 Both registered players, isParticipant:', isParticipant);
    return isParticipant;
  };

  const canConfirmResult = () => {
    if (match.status !== 'submitted') return false;
    
    // Tournament creator can always confirm any submitted result
    if (isCreator) {
      return true;
    }
    
    // For matches with guest players, only tournament creator can confirm (handled above)
    if (hasGuestPlayer) {
      return false;
    }
    
    // For regular matches, check if current user is NOT the one who submitted the result
    // Backend stores submitters in resultReportedBy array directly on match
    const resultReportedBy = match.resultReportedBy || [];
    return isParticipant && !resultReportedBy.includes(currentUserId);
  };

  const canDisputeResult = () => {
    if (match.status !== 'submitted') return false;
    
    // For matches with guest players, only tournament creator can dispute
    if (hasGuestPlayer) {
      return isCreator;
    }
    
    // For regular matches, check if current user is NOT the one who submitted the result
    const resultReportedBy = match.resultReportedBy || [];
    return isParticipant && !resultReportedBy.includes(currentUserId);
  };

  const canResolveDispute = () => {
    return match.status === 'disputed' && isCreator;
  };

  const handleSubmitResult = async () => {
    if (!selectedWinner) return;
    
    setIsSubmitting(true);
    try {
      const loserId = selectedWinner === match.player1.id ? match.player2.id : match.player1.id;
      await onSubmitResult(selectedWinner, loserId, notes);
      onClose();
    } catch (error) {
      console.error('Error submitting result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      disputed: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      forfeit: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[match.status]}`}>
        {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
      </span>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center" 
      style={{ zIndex: 99999 }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Match Result
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Round {match.roundNumber} • {getStatusBadge()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Match Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                {match.player1.fullName || match.player1.name}
              </div>
              {match.player1.username && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  @{match.player1.username}
                </div>
              )}
              {match.player1.isGuest && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 mt-1">
                  Guest
                </span>
              )}
            </div>
            
            <div className="px-4">
              <div className="text-2xl font-bold text-gray-400">VS</div>
            </div>
            
            <div className="text-center flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                {match.player2.fullName || match.player2.name}
              </div>
              {match.player2.username && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  @{match.player2.username}
                </div>
              )}
              {match.player2.isGuest && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 mt-1">
                  Guest
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Content */}
        <div className="p-6">
          {/* Submit Result Section */}
          {canSubmitResult() && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Submit Match Result
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Winner
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="winner"
                        value={match.player1.id}
                        checked={selectedWinner === match.player1.id}
                        onChange={(e) => setSelectedWinner(e.target.value)}
                        className="mr-3"
                      />
                      <span>{match.player1.fullName || match.player1.name}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="winner"
                        value={match.player2.id}
                        checked={selectedWinner === match.player2.id}
                        onChange={(e) => setSelectedWinner(e.target.value)}
                        className="mr-3"
                      />
                      <span>{match.player2.fullName || match.player2.name}</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes about the match..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleSubmitResult}
                  disabled={!selectedWinner || isSubmitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Result'}
                </button>
              </div>
            </div>
          )}

          {/* Result Submitted - Waiting for Opponent (for submitter) */}
          {match.status === 'submitted' && match.resultReportedBy?.includes(currentUserId) && isParticipant && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Result Submitted - Awaiting Opponent Response
              </h3>
              
              {match.result && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-sm text-green-800 dark:text-green-200">
                    <div className="font-medium mb-2">Your Submitted Result:</div>
                    <div>Winner: {match.result.winnerId === match.player1.id ? match.player1.name : match.player2.name}</div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Submitted: {new Date(match.result.submittedAt).toLocaleString()}
                    </div>
                    {match.result.notes && (
                      <div className="mt-2">
                        <span className="font-medium">Notes:</span> {match.result.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-center py-4">
                <div className="text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-center mb-2">
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Waiting for opponent to respond
                  </div>
                  <div className="text-sm">
                    Your opponent can confirm or dispute this result.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirm/Dispute Result Section (for opponent or tournament creator) */}
          {(canConfirmResult() || canDisputeResult()) && !(hasGuestPlayer && isCreator) && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {isCreator
                  ? "Tournament Creator - Confirm Result"
                  : "Result Awaiting Your Response"
                }
              </h3>
              
              {match.result && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <div className="font-medium mb-2">Submitted Result:</div>
                    <div>Winner: {match.result.winnerId === match.player1.id ? match.player1.name : match.player2.name}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Submitted: {new Date(match.result.submittedAt).toLocaleString()}
                    </div>
                    {match.result.notes && (
                      <div className="mt-2">
                        <span className="font-medium">Notes:</span> {match.result.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isCreator ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <div className="font-medium mb-2">Tournament Creator Override:</div>
                    <div>As the tournament creator, you can confirm this result if the opponent is unavailable.</div>
                    <div>You can also dispute the result if you believe it's incorrect.</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Your opponent has submitted a match result. Please confirm if you agree or dispute if you disagree.
                </div>
              )}

              {!showDisputeForm ? (
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await onConfirmResult();
                        onClose();
                      } catch (error) {
                        console.error('Error confirming result:', error);
                        alert('Failed to confirm result. Please try again.');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm Result'}
                  </button>
                  <button
                    onClick={() => setShowDisputeForm(true)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreator ? 'Override Result' : 'Dispute Result'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isCreator ? 'Reason for Override' : 'Reason for Dispute'}
                    </label>
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder={isCreator
                        ? "Explain why you're overriding this result..."
                        : "Please explain why you're disputing this result..."
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={async () => {
                        if (!disputeReason.trim()) {
                          alert('Please provide a reason for the dispute.');
                          return;
                        }
                        setIsSubmitting(true);
                        try {
                          await onDisputeResult(disputeReason);
                          onClose();
                        } catch (error) {
                          console.error('Error disputing result:', error);
                          alert('Failed to dispute result. Please try again.');
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      disabled={!disputeReason.trim() || isSubmitting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : (isCreator ? 'Submit Override' : 'Submit Dispute')}
                    </button>
                    <button
                      onClick={() => {
                        setShowDisputeForm(false);
                        setDisputeReason('');
                      }}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolve Dispute Section (Tournament Creator Only) */}
          {canResolveDispute() && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Resolve Match Dispute
              </h3>
              
              {match.result && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <div className="font-medium mb-2">Disputed Result:</div>
                    <div>Original Winner: {match.result.winnerId === match.player1.id ? match.player1.name : match.player2.name}</div>
                    {match.result.disputeReason && (
                      <div className="mt-2">
                        <span className="font-medium">Dispute Reason:</span> {match.result.disputeReason}
                      </div>
                    )}
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Disputed: {match.result.disputedAt ? new Date(match.result.disputedAt).toLocaleString() : 'Recently'}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                As the tournament organizer, you need to resolve this dispute by determining the actual winner.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Actual Winner
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="resolveWinner"
                        value={match.player1.id}
                        checked={selectedWinner === match.player1.id}
                        onChange={(e) => setSelectedWinner(e.target.value)}
                        className="mr-3"
                      />
                      <span>{match.player1.fullName || match.player1.name}</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="resolveWinner"
                        value={match.player2.id}
                        checked={selectedWinner === match.player2.id}
                        onChange={(e) => setSelectedWinner(e.target.value)}
                        className="mr-3"
                      />
                      <span>{match.player2.fullName || match.player2.name}</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Explain your decision and any additional context..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!selectedWinner) {
                      alert('Please select the actual winner.');
                      return;
                    }
                    setIsSubmitting(true);
                    try {
                      const loserId = selectedWinner === match.player1.id ? match.player2.id : match.player1.id;
                      await onResolveDispute(selectedWinner, loserId, notes);
                      onClose();
                    } catch (error) {
                      console.error('Error resolving dispute:', error);
                      alert('Failed to resolve dispute. Please try again.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={!selectedWinner || isSubmitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Resolving...' : 'Resolve Dispute'}
                </button>
              </div>
            </div>
          )}

          {/* Guest Match - Registered Player Submitted, Waiting for Creator */}
          {match.status === 'submitted' && hasGuestPlayer && !bothGuests && !isCreator && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Result Submitted - Awaiting Tournament Creator
              </h3>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-sm text-purple-800 dark:text-purple-200">
                  <div className="font-medium mb-2">Match involves guest player:</div>
                  <div>The guest player must notify the tournament creator in person.</div>
                  <div>The tournament creator will confirm or override this result.</div>
                </div>
              </div>

              <div className="text-center py-4">
                <div className="text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-center mb-2">
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Waiting for tournament creator decision
                  </div>
                  <div className="text-sm">
                    Guest player must confirm result with tournament creator.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guest vs Guest - Waiting for Creator Input */}
          {match.status === 'pending' && bothGuests && !isCreator && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Guest vs Guest Match
              </h3>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-sm text-purple-800 dark:text-purple-200">
                  <div className="font-medium mb-2">Both players are guests:</div>
                  <div>Both players must notify the tournament creator in person with the match result.</div>
                  <div>Only the tournament creator can input results for guest-only matches.</div>
                </div>
              </div>

              <div className="text-center py-4">
                <div className="text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-center mb-2">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Waiting for both guests to report to tournament creator
                  </div>
                  <div className="text-sm">
                    Please find the tournament creator to report your match result.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Creator Override Options for Guest Matches */}
          {match.status === 'submitted' && hasGuestPlayer && isCreator && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Guest Match - Creator Decision Required
              </h3>
              
              {match.result && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <div className="font-medium mb-2">Submitted Result:</div>
                    <div>Winner: {match.result.winnerId === match.player1.id ? match.player1.name : match.player2.name}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Submitted: {new Date(match.result.submittedAt).toLocaleString()}
                    </div>
                    {match.result.notes && (
                      <div className="mt-2">
                        <span className="font-medium">Notes:</span> {match.result.notes}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-sm text-purple-800 dark:text-purple-200">
                  <div className="font-medium mb-2">Guest Player Confirmation Required:</div>
                  <div>The guest player must confirm this result with you in person.</div>
                  <div>You can confirm the submitted result or override it with a different outcome.</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await onConfirmResult();
                        onClose();
                      } catch (error) {
                        console.error('Error confirming result:', error);
                        alert('Failed to confirm result. Please try again.');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm Submitted Result'}
                  </button>
                  <button
                    onClick={() => setShowOverrideForm(true)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Override Result
                  </button>
                </div>

                {showOverrideForm && (
                  <div className="space-y-3 border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Actual Winner
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="overrideWinner"
                            value={match.player1.id}
                            checked={selectedWinner === match.player1.id}
                            onChange={(e) => setSelectedWinner(e.target.value)}
                            className="mr-3"
                          />
                          <span>{match.player1.fullName || match.player1.name}</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="overrideWinner"
                            value={match.player2.id}
                            checked={selectedWinner === match.player2.id}
                            onChange={(e) => setSelectedWinner(e.target.value)}
                            className="mr-3"
                          />
                          <span>{match.player2.fullName || match.player2.name}</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Override Notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Explain why you're overriding the submitted result..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                        rows={3}
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={async () => {
                          if (!selectedWinner) {
                            alert('Please select the actual winner.');
                            return;
                          }
                          setIsSubmitting(true);
                          try {
                            const loserId = selectedWinner === match.player1.id ? match.player2.id : match.player1.id;
                            await onResolveDispute(selectedWinner, loserId, notes);
                            onClose();
                          } catch (error) {
                            console.error('Error overriding result:', error);
                            alert('Failed to override result. Please try again.');
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={!selectedWinner || isSubmitting}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Overriding...' : 'Override Result'}
                      </button>
                      <button
                        onClick={() => {
                          setShowOverrideForm(false);
                          setSelectedWinner('');
                          setNotes('');
                        }}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Completed Result */}
          {match.status === 'completed' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Match Completed
              </h3>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-sm text-green-800 dark:text-green-200">
                  <div className="font-medium mb-2">Final Result:</div>
                  <div className="text-lg font-semibold">
                    Winner: {match.winnerId === match.player1.id ? match.player1.name : match.player2.name}
                  </div>
                  {match.result && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                      {match.result.status === 'confirmed' && 'Result confirmed by opponent'}
                      {match.result.status === 'resolvedByCreator' && 'Dispute resolved by tournament organizer'}
                      {match.result.resolvedAt && ` • ${new Date(match.result.resolvedAt).toLocaleString()}`}
                    </div>
                  )}
                  {match.result?.notes && (
                    <div className="mt-2">
                      <span className="font-medium">Notes:</span> {match.result.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No Actions Available */}
          {!canSubmitResult() && !canConfirmResult() && !canDisputeResult() && !canResolveDispute() && match.status !== 'completed' && (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400">
                {match.status === 'submitted' 
                  ? 'Waiting for opponent to confirm or dispute the result.'
                  : 'No actions available for this match.'
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 