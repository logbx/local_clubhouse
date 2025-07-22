import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Tournament, TournamentMatch, TournamentRound, tournamentService } from '../services/tournament.service';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { StandardizedResultModal } from './StandardizedResultModal';
import { webSocketService } from '../services/websocket.service';

interface TournamentBracketProps {
  tournament: Tournament;
  onTournamentUpdate?: (tournament: Tournament) => void;
  isManageMode?: boolean;
  hideRoundHeaders?: boolean;
}

interface MatchCardProps {
  match: TournamentMatch;
  tournamentId: string;
  currentUserId?: string;
  isOrganizer: boolean;
  onTournamentUpdate?: (tournament: Tournament) => void;
  showAdminControls?: boolean;
  matchNumber?: number;
  roundName?: string;
}

interface ByePlayerCardProps {
  player: any;
  roundNumber: number;
}

const ByePlayerCard: React.FC<ByePlayerCardProps> = ({ player, roundNumber }) => {
  return (
    <div className="border-2 border-dashed border-yellow-400 dark:border-yellow-500 rounded-lg p-4 m-2 backdrop-blur-sm bg-yellow-50/60 dark:bg-yellow-900/20 transition-colors duration-200">
      <div className="text-sm font-semibold mb-3 text-yellow-700 dark:text-yellow-400">
        Bye - Auto Advance
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-100/80 dark:bg-yellow-800/40 border border-yellow-300 dark:border-yellow-600">
          <div className="flex items-center">
            <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
            <span className="ml-2 text-yellow-600 dark:text-yellow-400 text-sm">✓ Advances</span>
          </div>
          {player.isGuest && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Guest
            </span>
          )}
        </div>
        
        <div className="text-center text-yellow-600 dark:text-yellow-400 font-medium text-sm">
          No opponent - automatic win
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200">
          <ClockIcon className="h-3 w-3 mr-1" />
          Bye Round
        </span>
      </div>
    </div>
  );
};

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  tournamentId,
  currentUserId,
  isOrganizer,
  onTournamentUpdate,
  showAdminControls = true,
  matchNumber,
  roundName
}) => {
  const { user } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedWinner, setSelectedWinner] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [overriding, setOverriding] = useState(false);

  // Debug player matching ALWAYS for any match involving test3 or test4
  if (process.env.NODE_ENV === 'development' && (match.player1.name === 'test3' || match.player1.name === 'test4' || match.player2.name === 'test3' || match.player2.name === 'test4')) {
    console.log('🚨 TEST MATCH FOUND - PLAYER DEBUG:', {
      matchId: match.matchId,
      status: match.status,
      currentUserId: currentUserId,
      currentUserIdType: typeof currentUserId,
      player1: { 
        id: match.player1.id, 
        idType: typeof match.player1.id, 
        name: match.player1.name,
        directMatch: match.player1.id === currentUserId,
        stringMatch: String(match.player1.id) === String(currentUserId)
      },
      player2: { 
        id: match.player2.id, 
        idType: typeof match.player2.id, 
        name: match.player2.name,
        directMatch: match.player2.id === currentUserId,
        stringMatch: String(match.player2.id) === String(currentUserId)
      }
    });
  }

  // Check if current user is a player in this match (handle both id and userId)
  const isPlayerInMatch = currentUserId && (
    match.player1.id === currentUserId || 
    match.player2.id === currentUserId ||
    String(match.player1.id) === String(currentUserId) ||
    String(match.player2.id) === String(currentUserId)
  );
  const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
  
  // Updated logic: Allow registered players to submit results against guests
  // Organizers can always report/override, registered players can report against other registered players
  // or submit results against guest players
  const canReport = isOrganizer || isPlayerInMatch;
  
  // Check localStorage for submission info (temporary workaround)
  const submissionKey = `match_submission_${match.matchId}`;
  const storedSubmitterId = localStorage.getItem(submissionKey);
  const hasSubmittedViaLocalStorage = storedSubmitterId === currentUserId || 
                                     storedSubmitterId === String(currentUserId);
  
  // Check if current user submitted the result (more robust checking)
  // Handle multiple ID formats that might be stored in resultReportedBy
  const hasSubmittedResult = hasSubmittedViaLocalStorage || (match.resultReportedBy && Array.isArray(match.resultReportedBy)
    ? match.resultReportedBy.some(reporterId => {
        if (!currentUserId) return false;
        // Direct match
        if (reporterId === currentUserId) return true;
        // Try both string formats in case of ObjectId vs string mismatch
        if (reporterId === String(currentUserId)) return true;
        if (String(reporterId) === currentUserId) return true;
        return false;
      })
    : match.resultReportedBy === currentUserId || 
      match.resultReportedBy === String(currentUserId) || 
      String(match.resultReportedBy) === currentUserId);

  // Additional check: if the match is submitted and we're the only player in the match
  // who can submit results, we likely submitted it (fallback for race conditions)
  // IMPORTANT: Only use this fallback if resultReportedBy is completely missing/null
  const isLikelySubmitter = false; // Disabled to fix the confirm/dispute issue
  
  // Smart detection: If resultReportedBy is missing but we have a winner,
  // the winner is likely the one who submitted (common pattern)
  let smartSubmitterDetection = false;
  if (match.status === 'submitted' && !match.resultReportedBy && match.winnerId && isPlayerInMatch) {
    // If current user is the winner, they likely submitted the result
    smartSubmitterDetection = match.winnerId === currentUserId || 
                            String(match.winnerId) === String(currentUserId);
  }

  const actuallySubmittedResult = hasSubmittedResult || isLikelySubmitter || smartSubmitterDetection;
  
  // Debug logging for ID matching issues - ALWAYS LOG for submitted matches
  if (match.status === 'submitted' && process.env.NODE_ENV === 'development') {
    console.log('🔍 SUBMITTED MATCH DEBUG - Current User View:', {
        matchId: match.matchId,
        currentUserId,
        currentUser: user?.email || 'N/A',
      player1: { id: match.player1.id, name: match.player1.name, isGuest: match.player1.isGuest },
      player2: { id: match.player2.id, name: match.player2.name, isGuest: match.player2.isGuest },
      winnerId: match.winnerId,
      loserId: match.loserId,
        resultReportedBy: match.resultReportedBy,
      resultObject: match.result, // Check if result info is here
      localStorageSubmitter: storedSubmitterId,
      hasSubmittedViaLocalStorage,
        hasSubmittedResult,
        isLikelySubmitter,
      smartSubmitterDetection,
        actuallySubmittedResult,
        isPlayerInMatch,
      isOrganizer,
      hasGuestPlayer,
      shouldSeeConfirmDispute: match.status === 'submitted' && isPlayerInMatch && !actuallySubmittedResult && !isOrganizer && !hasGuestPlayer
      });
  }
  
  // Updated logic: Allow both players in match AND organizers to confirm submitted results
  // Players can confirm if they're in the match and didn't submit the result
  // Organizers can confirm any submitted result (especially for guest player matches)
  const needsConfirmation = match.status === 'submitted' && (
    (isPlayerInMatch && !actuallySubmittedResult) || // Player confirmation
    (isOrganizer && hasGuestPlayer) // Organizer confirmation for guest matches
  );
  
  // Add canConfirm variable for the UI - Only non-organizer players can confirm
  const canConfirm = match.status === 'submitted' && 
    isPlayerInMatch && 
    !actuallySubmittedResult && 
    !isOrganizer;
  
  // Show dispute button if user is in match, match is submitted, and user did NOT submit the result
  const canDispute = match.status === 'submitted' && isPlayerInMatch && !actuallySubmittedResult;
  
  // Failsafe: If result is submitted but no one can confirm, allow both players to act
  // This handles edge cases where resultReportedBy might be incorrect
  const noOneCanConfirm = match.status === 'submitted' && 
    !canConfirm && !canDispute && 
    isPlayerInMatch && !isOrganizer;
  
  const canConfirmFailsafe = noOneCanConfirm;
  const canDisputeFailsafe = noOneCanConfirm;

  // Show resolve button if user is organizer and match is disputed
  const canResolve = match.status === 'disputed' && isOrganizer;

  const handleStandardizedResult = async (result: 'win' | 'loss' | 'draw', reason?: string) => {
    setReporting(true);
    try {
      let winnerId: string | null = null;
      let loserId: string | null = null;
      
      if (result === 'draw') {
        // Single elimination doesn't support draws, but we keep this for consistency
        winnerId = null;
        loserId = null;
      } else {
        winnerId = result === 'win' ? match.player1.id : match.player2.id;
        loserId = result === 'win' ? match.player2.id : match.player1.id;
      }
      
      console.log('🏓 Setting match result:', {
        matchId: match.matchId,
        result,
        winnerId,
        loserId,
        reason,
        matchStatus: match.status,
        isOrganizer,
        userType: isOrganizer ? 'organizer' : 'player'
      });

      let updatedTournament: any;
      
      if (isOrganizer) {
        // Organizers use override endpoint
        updatedTournament = await tournamentService.overrideMatchResult(
          tournamentId,
          match.matchId,
          winnerId,
          loserId,
          'completed',
          result,
          reason
        );
      } else {
        // Players use submit result endpoint (puts match in "submitted" status)
        if (!winnerId || !loserId) {
          throw new Error('Winner and loser must be specified');
        }
        updatedTournament = await tournamentService.submitMatchResult(
          tournamentId,
          match.matchId,
          winnerId,
          loserId,
          false, // isDraw - false for SET
          reason
        );
        
        // Store submission info in localStorage as temporary workaround
        if (currentUserId) {
          const submissionKey = `match_submission_${match.matchId}`;
          localStorage.setItem(submissionKey, currentUserId);
          // Auto-cleanup after 1 hour
          setTimeout(() => localStorage.removeItem(submissionKey), 3600000);
        }
      }
      onTournamentUpdate?.(updatedTournament);
      
      setShowReportModal(false);
    } catch (error) {
      console.error('Failed to set result:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        const errorMessage = axiosError.response?.data?.message || 'Failed to set result. Please try again.';
        alert(errorMessage);
      } else {
        alert('Failed to set result. Please try again.');
      }
    } finally {
      setReporting(false);
    }
  };

  const handleConfirmResult = async () => {
    // Safety check: Don't allow users to confirm their own results (but allow organizers)
    if (hasSubmittedResult && !isOrganizer) {
      console.error('❌ User trying to confirm their own result - blocking request');
      alert('You cannot confirm your own submitted result.');
      return;
    }
    
    console.log('✅ Confirming match result:', {
      matchId: match.matchId,
      isOrganizer,
      currentUserId,
      matchStatus: match.status,
      hasSubmittedResult,
      roundInfo: 'This should work for ANY round including finals'
    });
    
    try {
      const updatedTournament = await tournamentService.confirmMatchResult(tournamentId, match.matchId);
      console.log('✅ Confirmation successful for match:', match.matchId);
      onTournamentUpdate?.(updatedTournament);
    } catch (error) {
      console.error('Failed to confirm result:', error);
      alert('Failed to confirm result. Please try again.');
    }
  };

  const handleDisputeResult = async () => {
    if (!disputeReason.trim()) {
      alert('Please provide a reason for the dispute.');
      return;
    }
    
    console.log('⚠️ Disputing match result:', {
      matchId: match.matchId,
      disputeReason: disputeReason.trim(),
      currentUserId,
      isOrganizer,
      matchStatus: match.status,
      roundInfo: 'This should work for ANY round including finals'
    });
    
    setDisputing(true);
    try {
      const updatedTournament = await tournamentService.disputeMatchResult(
        tournamentId,
        match.matchId,
        disputeReason.trim()
      );
      console.log('⚠️ Dispute submitted successfully for match:', match.matchId);
      onTournamentUpdate?.(updatedTournament);
      setShowDisputeModal(false);
      setDisputeReason('');
    } catch (error) {
      console.error('Failed to dispute result:', error);
      alert('Failed to dispute result. Please try again.');
    } finally {
      setDisputing(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedWinner) {
      alert('Please select a winner to resolve the dispute.');
      return;
    }
    
    setResolving(true);
    try {
      const loserId = selectedWinner === match.player1.id ? match.player2.id : match.player1.id;
      const updatedTournament = await tournamentService.resolveMatchDispute(
        tournamentId,
        match.matchId,
        selectedWinner,
        loserId,
        false,
        resolutionNotes.trim()
      );
      onTournamentUpdate?.(updatedTournament);
      setShowResolveModal(false);
      setSelectedWinner('');
      setResolutionNotes('');
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
      alert('Failed to resolve dispute. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const handleOverrideResultWithStandardFormat = async (winnerId: string, reason?: string) => {
    setOverriding(true);
    try {
      const loserId = winnerId === match.player1.id ? match.player2.id : match.player1.id;
      
      console.log('🔧 Overriding match result:', {
        tournamentId,
        matchId: match.matchId,
        winnerId,
        loserId,
        reason: reason?.trim() || '',
        isOrganizer
      });
      
      const updatedTournament = await tournamentService.overrideMatchResult(
        tournamentId,
        match.matchId,
        winnerId,
        loserId,
        'completed',
        'win',
        reason?.trim() || ''
      );
      
      console.log('✅ Match result overridden successfully');
      onTournamentUpdate?.(updatedTournament);
      setShowOverrideModal(false);
      setSelectedWinner('');
      setOverrideReason('');
    } catch (error) {
      console.error('Failed to override result:', error);
      alert('Failed to override result. Please try again.');
    } finally {
      setOverriding(false);
    }
  };

  const getMatchStatusColor = () => {
    switch (match.status) {
      case 'completed': 
        return 'bg-green-50/80 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      case 'submitted': 
        return 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
      case 'disputed': 
        return 'bg-red-50/80 dark:bg-red-900/20 border-red-300 dark:border-red-700';
      case 'pending': 
        return 'bg-gray-50/80 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
      case 'forfeit': 
        return 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
      default: 
        return 'bg-gray-50/80 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 m-2 backdrop-blur-sm ${getMatchStatusColor()} transition-colors duration-200`}>
      <div className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
        {roundName ? `${roundName} - Match ${matchNumber || 1}` : `Match ${matchNumber || 1}`}
      </div>
      
      {/* Players */}
      <div className="space-y-2">
        <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
          match.winnerId === match.player1.id 
            ? 'bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600' 
            : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600'
        }`}>
          <div className="flex items-center">
            <span className="font-medium text-gray-900 dark:text-white">{match.player1.name}</span>
            {match.winnerId === match.player1.id && (
              <CheckIcon className="h-4 w-4 ml-2 text-green-600 dark:text-green-400" />
            )}
          </div>
          {match.player1.isGuest && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Guest
            </span>
          )}
        </div>
        
        <div className="text-center text-gray-500 dark:text-gray-400 font-medium">vs</div>
        
        <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
          match.winnerId === match.player2.id 
            ? 'bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600' 
            : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600'
        }`}>
          <div className="flex items-center">
            <span className="font-medium text-gray-900 dark:text-white">{match.player2.name}</span>
            {match.winnerId === match.player2.id && (
              <CheckIcon className="h-4 w-4 ml-2 text-green-600 dark:text-green-400" />
            )}
          </div>
          {match.player2.isGuest && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Guest
            </span>
          )}
        </div>
      </div>

      {/* Match Status */}
      <div className="mt-4">
        {match.status === 'completed' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center text-green-700 dark:text-green-300">
              <CheckIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Match Completed</span>
            </div>
            {isOrganizer && showAdminControls && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="mt-2 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline"
              >
                Set Result (Admin)
              </button>
            )}
          </div>
        )}

        {match.status === 'submitted' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <div className="flex items-center text-orange-700 dark:text-orange-300 mb-2">
              <ClockIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Result Submitted - Awaiting Confirmation</span>
            </div>
            
            {/* Message for user who submitted the result */}
            {actuallySubmittedResult && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mb-2 italic">
                You submitted this result. Waiting for your opponent to confirm.
              </div>
            )}
            
            {/* Message for user who needs to confirm */}
            {isPlayerInMatch && !actuallySubmittedResult && (
              <div className="text-xs text-orange-600 dark:text-orange-400 mb-2 italic">
                Your opponent submitted this result. Please confirm or contest it.
              </div>
            )}
            
            <div className="space-y-2">
              {(canConfirm || canConfirmFailsafe) && (
                <button 
                  onClick={handleConfirmResult}
                  className="w-full btn btn-success text-sm py-2 font-medium"
                >
                  ✅ Accept Result
                </button>
              )}
              {(canDispute || canDisputeFailsafe) && (
                <button 
                  onClick={() => setShowDisputeModal(true)}
                  className="w-full btn btn-warning text-sm py-2 font-medium"
                >
                  ⚠️ Contest Result
                </button>
              )}
              
              {/* Failsafe message */}
              {noOneCanConfirm && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ System detected submission issue. You can still accept or contest this result.
                </div>
              )}
              
              {isOrganizer && showAdminControls && (
                <button 
                  onClick={() => setShowOverrideModal(true)}
                  className="w-full btn btn-primary text-sm py-2"
                >
                  Override Result (Admin)
                </button>
              )}
            </div>
          </div>
        )}

        {match.status === 'disputed' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center text-red-700 dark:text-red-300 mb-2">
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Result Disputed</span>
            </div>
            {match.result?.disputeReason && (
              <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                Reason: {match.result.disputeReason}
              </div>
            )}
            {isOrganizer && showAdminControls && (
              <div className="space-y-2">
                <button 
                  onClick={() => setShowResolveModal(true)}
                  className="w-full btn btn-primary text-sm py-2"
                >
                  Resolve Dispute
                </button>
                <button 
                  onClick={() => setShowOverrideModal(true)}
                  className="w-full btn btn-secondary text-sm py-2"
                >
                  Override Result
                </button>
              </div>
            )}
          </div>
        )}

        {match.status === 'pending' && (
          <div className="space-y-2">
            {canReport && !isOrganizer && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full btn btn-primary"
              >
                Report Result
              </button>
            )}
            {isOrganizer && showAdminControls && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full btn btn-primary"
              >
                Set Result (Admin)
              </button>
            )}
          </div>
        )}

        {/* New section: Confirm/Dispute area for registered players when result is submitted */}
        {(() => {
          // More robust check for who should see confirm/dispute options
          const isSubmittedMatch = match.status === 'submitted';
          const isBothRegisteredPlayers = !hasGuestPlayer;
          const isPlayerInThisMatch = isPlayerInMatch && !isOrganizer;
          
          // Check if current user did NOT submit the result (more explicit check)
          const didNotSubmitResult = !actuallySubmittedResult;
          
          // Alternative check: if we have resultReportedBy data, use it explicitly
          let alternativeCheck = true;
          if (match.resultReportedBy) {
            // Handle both array and single value formats
            if (Array.isArray(match.resultReportedBy)) {
              alternativeCheck = !match.resultReportedBy.includes(currentUserId) && 
                               !match.resultReportedBy.includes(String(currentUserId));
            } else {
              alternativeCheck = match.resultReportedBy !== currentUserId && 
                               match.resultReportedBy !== String(currentUserId) && 
                               String(match.resultReportedBy) !== currentUserId;
            }
          }
          
          // Updated logic: Only show confirm/dispute for registered vs registered matches
          // If there's a guest player, only organizer can confirm
          const shouldShowConfirmDispute = isSubmittedMatch && 
                                         isBothRegisteredPlayers && 
                                         isPlayerInThisMatch && 
                                         didNotSubmitResult && 
                                         alternativeCheck &&
                                         !hasGuestPlayer; // Hide buttons if there's a guest player

          // Debug log for this specific section
          if (match.status === 'submitted' && process.env.NODE_ENV === 'development') {
            console.log('🎯 CONFIRM/DISPUTE SECTION CHECK:', {
              matchId: match.matchId,
              shouldShowConfirmDispute,
              breakdown: {
                isSubmittedMatch,
                isBothRegisteredPlayers, 
                isPlayerInThisMatch,
                didNotSubmitResult,
                alternativeCheck,
                hasGuestPlayer
              },
              resultReportedBy: match.resultReportedBy,
              currentUserId
            });
          }
          
          return shouldShowConfirmDispute;
        })() && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
              Your opponent submitted a result. Please review and respond:
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={handleConfirmResult}
                className="w-full btn btn-success text-sm py-2 font-medium"
              >
                ✅ Confirm Result
              </button>
              <button 
                onClick={() => setShowDisputeModal(true)}
                className="w-full btn btn-warning text-sm py-2 font-medium"
              >
                ⚠️ Dispute Result
              </button>
            </div>
            
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
              This match is between two registered players. Please confirm or dispute the submitted result.
            </div>
          </div>
        )}

        {/* Show organizer waiting message for guest player matches */}
        {match.status === 'submitted' && hasGuestPlayer && isPlayerInMatch && !isOrganizer && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
              Result submitted - awaiting organizer confirmation
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 italic">
              This match involves a guest player. Only the organizer can confirm results for guest players.
            </div>
          </div>
        )}

        {/* Debug info for new confirm/dispute section */}
        {process.env.NODE_ENV === 'development' && match.status === 'submitted' && (() => {
          // Recreate the logic for debugging
          const isSubmittedMatch = match.status === 'submitted';
          const isBothRegisteredPlayers = !hasGuestPlayer;
          const isPlayerInThisMatch = isPlayerInMatch && !isOrganizer;
          const didNotSubmitResult = !actuallySubmittedResult;
          
          let alternativeCheck = true;
          if (match.resultReportedBy) {
            alternativeCheck = match.resultReportedBy !== currentUserId && 
                             match.resultReportedBy !== String(currentUserId) && 
                             String(match.resultReportedBy) !== currentUserId;
          }
          
          const shouldShowConfirmDispute = isSubmittedMatch && 
                                         isBothRegisteredPlayers && 
                                         isPlayerInThisMatch && 
                                         didNotSubmitResult && 
                                         alternativeCheck;
          
          return (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
              🔧 New Confirm/Dispute Section Debug:<br />
              shouldShowConfirmDispute={String(shouldShowConfirmDispute)}<br />
              isSubmittedMatch={String(isSubmittedMatch)}, isBothRegisteredPlayers={String(isBothRegisteredPlayers)}<br />
              isPlayerInThisMatch={String(isPlayerInThisMatch)}, didNotSubmitResult={String(didNotSubmitResult)}<br />
              alternativeCheck={String(alternativeCheck)}<br />
              actuallySubmittedResult={String(actuallySubmittedResult)} (hasSubmitted={String(hasSubmittedResult)}, isLikely={String(isLikelySubmitter)})<br />
              currentUserId="{currentUserId}"<br />
              resultReportedBy="{String(match.resultReportedBy)}" (type: {typeof match.resultReportedBy})<br />
              MATCH_CHECK: reportedBy===currentUserId? {String(match.resultReportedBy === currentUserId)}
            </div>
          );
        })()}
      </div>

      {/* Standardized Result Modal */}
      {showReportModal && (
        <StandardizedResultModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          match={match}
          onSubmit={handleStandardizedResult}
          allowDraws={false}
          isSwissTournament={false}
        />
      )}

      {/* Dispute Result Modal */}
      {showDisputeModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center" 
          style={{ zIndex: 999999 }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700"
            style={{ zIndex: 1000000 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Dispute Match Result
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reason for dispute
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Please explain why you are disputing this result..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={handleDisputeResult}
                disabled={!disputeReason.trim() || disputing}
                className="flex-1 btn btn-primary"
              >
                {disputing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Disputing...
                  </span>
                ) : (
                  'Dispute'
                )}
              </button>
              <button 
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeReason('');
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Dispute Modal */}
      {showResolveModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center" 
          style={{ zIndex: 999999 }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700"
            style={{ zIndex: 1000000 }}
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Resolve Match Dispute
            </h3>
            
            {match.result?.disputeReason && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Dispute reason:</strong> {match.result.disputeReason}
                </p>
              </div>
            )}
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="winner" 
                  value={match.player1.id}
                  checked={selectedWinner === match.player1.id}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  {match.player1.name} wins
                </span>
              </label>
              
              <label className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input 
                  type="radio" 
                  name="winner" 
                  value={match.player2.id}
                  checked={selectedWinner === match.player2.id}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  className="mr-3"
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  {match.player2.name} wins
                </span>
              </label>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resolution notes (optional)
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add any notes about how this dispute was resolved..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={handleResolveDispute}
                disabled={!selectedWinner || resolving}
                className="flex-1 btn btn-primary"
              >
                {resolving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resolving...
                  </span>
                ) : (
                  'Resolve'
                )}
              </button>
              <button 
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedWinner('');
                  setResolutionNotes('');
                }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Result Modal */}
      {showOverrideModal && (() => {
        // Determine the current winner from the match to pre-select in override modal
        let initialResult: 'win' | 'loss' | 'draw' = 'win'; // default
        
        if (match.winnerId) {
          if (match.winnerId === match.player1.id) {
            initialResult = 'win';  // Player 1 wins
          } else if (match.winnerId === match.player2.id) {
            initialResult = 'loss'; // Player 2 wins (loss from player1 perspective)
          }
        }
        
        return (
          <StandardizedResultModal
            isOpen={showOverrideModal}
            onClose={() => {
                  setShowOverrideModal(false);
                  setSelectedWinner('');
                  setOverrideReason('');
                }}
            match={match}
            onSubmit={(result: 'win' | 'loss' | 'draw', reason?: string) => {
              // Convert the standardized result format to override format
              const winnerId = result === 'win' ? match.player1.id : match.player2.id;
              setSelectedWinner(winnerId);
              setOverrideReason(reason || '');
              
              // Call the override handler with the selected winner and reason
              handleOverrideResultWithStandardFormat(winnerId, reason);
            }}
            allowDraws={false}
            isSwissTournament={false}
            title="Override Match Result"
            submitButtonText="Override Result"
            initialResult={initialResult}
          />
        );
      })()}
    </div>
  );
};

const TournamentBracket: React.FC<TournamentBracketProps> = ({
  tournament,
  onTournamentUpdate,
  isManageMode = false,
  hideRoundHeaders = false
}) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // IMPORTANT: Only apply filtering logic to Single Elimination tournaments
  // Swiss tournaments should display all data exactly as provided by backend
  const isSwissTournament = tournament.type === 'swiss';

  // Helper function to filter bye players to prevent duplicates across rounds
  const getFilteredByePlayers = (round: TournamentRound, roundIndex: number): any[] => {
    if (!round.byePlayers) return [];
    
    // For Swiss tournaments, always show all bye players as provided by backend
    if (isSwissTournament) return round.byePlayers;
    
    // For Single Elimination tournaments:
    // FIXED: Players can legitimately receive multiple byes across different rounds
    // Only filter out duplicate bye entries within the same round, not across rounds
    // The backend manages bye logic correctly, so trust its data
    return round.byePlayers;
  };

  // Helper function to determine if a match should be displayed
  const shouldShowMatch = (match: TournamentMatch): boolean => {
    // For Swiss tournaments, always show all matches as provided by backend
    if (isSwissTournament) return true;
    
    // For Single Elimination, don't show matches where both players are TBD
    if (match.player1?.id === 'TBD' && match.player2?.id === 'TBD') {
      return false;
    }
    return true;
  };
  
  // Add WebSocket integration for real-time updates with optimizations
  useEffect(() => {
    if (!tournament || !tournament.isStarted) return;

    const tournamentId = tournament.id || tournament._id || '';
    if (!tournamentId) return;

    // Join tournament room for real-time updates
    webSocketService.joinTournament(tournamentId);

    // Event deduplication and debouncing
    const processedEvents = new Set<string>();
    let refreshTimeout: NodeJS.Timeout | null = null;

    const debouncedRefresh = (eventType: string, delay: number = 300) => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      
      refreshTimeout = setTimeout(async () => {
        try {
          setIsUpdating(true);
            const updatedTournament = await tournamentService.getTournament(tournamentId);
          console.log(`✅ Tournament data refreshed from ${eventType} (debounced)`);
            onTournamentUpdate?.(updatedTournament);
          } catch (error) {
            console.error('❌ Error refreshing tournament data:', error);
          } finally {
          setTimeout(() => setIsUpdating(false), 500);
          refreshTimeout = null;
        }
      }, delay);
    };

    const handleTournamentUpdate = (data: any) => {
      // Check if event is for our tournament
      if (data.tournamentId && data.tournamentId !== tournamentId) {
        return;
      }

      // Create unique event key for deduplication
      const eventKey = `${data.type}-${data.tournamentId || tournamentId}-${data.matchId || 'no-match'}-${Date.now()}`;
      
      // Skip if this exact event was processed recently (within 1 second)
      const recentEventKey = `${data.type}-${data.tournamentId || tournamentId}-${data.matchId || 'no-match'}`;
      if (processedEvents.has(recentEventKey)) {
        console.log('🔒 Duplicate event ignored:', data.type);
        return;
      }
      
      processedEvents.add(recentEventKey);
      
      // Clean up old events to prevent memory leaks
      if (processedEvents.size > 20) {
        const eventsArray = Array.from(processedEvents);
        eventsArray.slice(0, 10).forEach(event => processedEvents.delete(event));
      }

      // Remove event from deduplication after 2 seconds to allow legitimate repeats
      setTimeout(() => {
        processedEvents.delete(recentEventKey);
      }, 2000);

      console.log('🔔 Tournament Bracket WebSocket update received:', data.type);
      
      // Handle different event types with appropriate debouncing
      if (data.type === 'match-result-reported' || data.type === 'match-result-submitted') {
        console.log('🏓 Match result submitted/reported:', data.matchId);
        debouncedRefresh('match-result-update', 200); // Quick refresh for match results
      }
      else if (data.type === 'round-started') {
        console.log('🚀 Round started! Refreshing tournament data...');
        debouncedRefresh('round-start', 500); // Slightly longer delay for round starts
      }
      else if (data.type === 'tournament-completed') {
        console.log('🏆 Tournament completed! Refreshing data...');
        debouncedRefresh('tournament-completion', 100); // Quick refresh for completion
      }
    };

    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      webSocketService.removeTournamentListeners();
      webSocketService.leaveTournament(tournamentId);
    };
  }, [tournament?.id, tournament?.isStarted, onTournamentUpdate]);
  
  if (!tournament.isStarted || tournament.rounds.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Bracket Available</h3>
          <p className="text-gray-600 dark:text-gray-400">
            The tournament hasn't started yet, so there's no bracket to display.
          </p>
        </div>
      </div>
    );
  }

  const isOrganizer = tournament.organizerId === user?.id;
  // Fix the tournament ID issue - use either id or _id, fallback to empty string
  const tournamentId = tournament.id || tournament._id || '';

  // Early return if no valid tournament ID
  if (!tournamentId) {
    console.error('❌ No valid tournament ID found:', { id: tournament.id, _id: tournament._id });
    return (
      <div className="text-center py-12">
        <div className="text-red-600 dark:text-red-400">
          Error: Invalid tournament ID. Please refresh the page.
        </div>
      </div>
    );
  }

  // Add this helper function at the top level
  const didUserSubmitResult = (match: TournamentMatch, userId: string): boolean => {
    if (!match.resultReportedBy) return false;
    return Array.isArray(match.resultReportedBy) 
      ? match.resultReportedBy.includes(userId)
      : match.resultReportedBy === userId;
  };

  // In the TournamentBracket component
  const renderMatchStatus = (match: TournamentMatch) => {
    const userSubmittedResult = didUserSubmitResult(match, user?.id);
    const isUserInMatch = match.player1.id === user?.id || match.player2.id === user?.id;

    if (match.status === 'completed') {
      return (
        <div className="text-green-600 dark:text-green-400">
          Match Completed
        </div>
      );
    }

    if (match.status === 'submitted') {
      if (userSubmittedResult) {
        // User submitted - only show waiting message
        return (
          <div className="text-orange-500 dark:text-orange-400">
            You submitted this result. Waiting for your opponent to confirm.
          </div>
        );
      }

      if (isUserInMatch && !userSubmittedResult) {
        // User is in match but hasn't submitted - show confirm/contest buttons
        return (
          <div className="space-y-2">
            <div className="text-orange-500 dark:text-orange-400">
              Result Submitted - Awaiting Confirmation
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleConfirmResult(match)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ✓ Accept Result
              </button>
              <button
                onClick={() => handleDisputeResult(match)}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                ⚠ Contest Result
              </button>
            </div>
          </div>
        );
      }

      // User not in match or other cases
      return (
        <div className="text-orange-500 dark:text-orange-400">
          Result Submitted - Awaiting Confirmation
        </div>
      );
    }

    // Match is pending
    return (
      <div className="text-gray-500 dark:text-gray-400">
        Match Pending
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Real-time update indicator */}
      {isUpdating && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center space-x-2 text-blue-700 dark:text-blue-300">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium">Updating tournament in real-time...</span>
          </div>
        </div>
      )}

      {tournament.rounds.map((round: TournamentRound, roundIndex: number) => {
        // Determine if this is the current active round (first incomplete round)
        const currentActiveRound = tournament.rounds.find(r => !r.isComplete);
        const isCurrentActiveRound = currentActiveRound && round.roundNumber === currentActiveRound.roundNumber;
        
        // Filter matches and bye players using our helper functions
        const visibleMatches = round.matches.filter(shouldShowMatch);
        const filteredByePlayers = getFilteredByePlayers(round, roundIndex);
        
        // Don't render empty rounds (no visible matches and no bye players)
        if (visibleMatches.length === 0 && filteredByePlayers.length === 0) {
          return null;
        }
        
        return (
          <div key={roundIndex} className="space-y-4">
            {!hideRoundHeaders && (
              <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">
                {roundIndex === tournament.rounds.length - 1 && tournament.rounds.length > 1
                  ? 'Final'
                  : roundIndex === tournament.rounds.length - 2 && tournament.rounds.length > 2
                  ? 'Semi-Final'
                  : `Round ${roundIndex + 1}`}
              </h3>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Regular Matches */}
              {visibleMatches.map((match: TournamentMatch, index: number) => (
                <MatchCard
                  key={match.matchId || `match-${roundIndex}-${index}`}
                  match={match}
                  tournamentId={tournamentId}
                  currentUserId={user?.id}
                  isOrganizer={isOrganizer}
                  onTournamentUpdate={onTournamentUpdate}
                  showAdminControls={isCurrentActiveRound}
                  matchNumber={index + 1}
                  roundName={roundIndex === tournament.rounds.length - 1 && tournament.rounds.length > 1
                    ? 'Final'
                    : roundIndex === tournament.rounds.length - 2 && tournament.rounds.length > 2
                    ? 'Semi-Final'
                    : `Round ${roundIndex + 1}`}
                />
              ))}
              
              {/* Bye Players - Only show filtered ones */}
              {filteredByePlayers.map((player: any, index: number) => (
                <ByePlayerCard
                  key={`bye-${player.id}-${index}`}
                  player={player}
                  roundNumber={round.roundNumber}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TournamentBracket; 