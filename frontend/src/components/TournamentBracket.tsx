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
}

interface MatchCardProps {
  match: TournamentMatch;
  tournamentId: string;
  currentUserId?: string;
  isOrganizer: boolean;
  onTournamentUpdate?: (tournament: Tournament) => void;
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
  onTournamentUpdate
}) => {
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

  // Check if current user is a player in this match (handle both id and userId)
  const isPlayerInMatch = currentUserId && (
    match.player1.userId === currentUserId || 
    match.player2.userId === currentUserId ||
    match.player1.id === currentUserId || 
    match.player2.id === currentUserId
  );
  const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
  
  // Updated logic: Allow registered players to submit results against guests
  // Organizers can always report/override, registered players can report against other registered players
  // or submit results against guest players
  const canReport = isOrganizer || isPlayerInMatch;
  
  // Check if current user submitted the result (more robust checking)
  const hasSubmittedResult = match.resultReportedBy?.includes(currentUserId || '') || false;
  
  // Updated logic: Allow both players in match AND organizers to confirm submitted results
  // Players can confirm if they're in the match and didn't submit the result
  // Organizers can confirm any submitted result (especially for guest player matches)
  const needsConfirmation = match.status === 'submitted' && (
    (isPlayerInMatch && !hasSubmittedResult) || // Player confirmation
    (isOrganizer && hasGuestPlayer) // Organizer confirmation for guest matches
  );
  
  // Add canConfirm variable for the UI
  const canConfirm = match.status === 'submitted' && (
    (isPlayerInMatch && !hasSubmittedResult) || 
    isOrganizer
  );
  
  // Show dispute button if user is in match, match is submitted, and user did NOT submit the result
  const canDispute = match.status === 'submitted' && isPlayerInMatch && !hasSubmittedResult;

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
      
      console.log('🏓 Setting match result (admin):', {
        matchId: match.matchId,
        result,
        winnerId,
        loserId,
        reason,
        matchStatus: match.status
      });

      // Always use override since this is admin-only
      const updatedTournament = await tournamentService.overrideMatchResult(
        tournamentId,
        match.matchId,
        winnerId,
        loserId,
        'completed',
        result,
        reason
      );
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

  const handleOverrideResult = async () => {
    if (!selectedWinner) {
      alert('Please select a winner.');
      return;
    }
    
    setOverriding(true);
    try {
      const loserId = selectedWinner === match.player1.id ? match.player2.id : match.player1.id;
      
      console.log('🔧 Overriding match result:', {
        tournamentId,
        matchId: match.matchId,
        selectedWinner,
        loserId,
        reason: overrideReason.trim(),
        isOrganizer
      });
      
      const updatedTournament = await tournamentService.overrideMatchResult(
        tournamentId,
        match.matchId,
        selectedWinner,
        loserId,
        'completed',
        'win',
        overrideReason.trim()
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
        Match {match.matchId ? match.matchId.slice(-8) : 'Unknown'}
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
            {isOrganizer && (
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
            <div className="space-y-2">
              {canConfirm && (
                <button 
                  onClick={handleConfirmResult}
                  className="w-full btn btn-success text-sm py-2"
                >
                  Confirm Result
                </button>
              )}
              {canDispute && (
                <button 
                  onClick={() => setShowDisputeModal(true)}
                  className="w-full btn btn-warning text-sm py-2"
                >
                  Dispute Result
                </button>
              )}
              {isOrganizer && (
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
            {isOrganizer && (
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
            {isOrganizer && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full btn btn-primary"
              >
                Set Result (Admin)
              </button>
            )}
          </div>
        )}
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
    </div>
  );
};

const TournamentBracket: React.FC<TournamentBracketProps> = ({
  tournament,
  onTournamentUpdate,
  isManageMode = false
}) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Add WebSocket integration for real-time updates
  useEffect(() => {
    if (!tournament || !tournament.isStarted) return;

    const tournamentId = tournament.id || tournament._id || '';
    if (!tournamentId) return;

    // Join tournament room for real-time updates
    webSocketService.joinTournament(tournamentId);

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 Tournament Bracket WebSocket update received:', data);
      
      // Handle various tournament update types
      if (data.type === 'match-result-reported') {
        // Show specific match update notification
        console.log('🏓 Match result reported by another user:', data.matchId);
        setIsUpdating(true);
        
        // Refresh tournament data
        const refreshTournament = async () => {
          try {
            const updatedTournament = await tournamentService.getTournament(tournamentId);
            console.log('✅ Tournament data refreshed from match result update');
            onTournamentUpdate?.(updatedTournament);
          } catch (error) {
            console.error('❌ Error refreshing tournament data:', error);
          } finally {
            setTimeout(() => setIsUpdating(false), 1500);
          }
        };
        refreshTournament();
      } else if (data.type === 'round-completed') {
        // Show round completion notification
        console.log('🏆 Round completed, advancing to next round');
        setIsUpdating(true);
        
        const refreshTournament = async () => {
          try {
            const updatedTournament = await tournamentService.getTournament(tournamentId);
            console.log('✅ Tournament data refreshed from round completion');
            onTournamentUpdate?.(updatedTournament);
          } catch (error) {
            console.error('❌ Error refreshing tournament data:', error);
          } finally {
            setTimeout(() => setIsUpdating(false), 2000);
          }
        };
        refreshTournament();
      } else if (data.type === 'tournament-finished') {
        // Show tournament completion notification
        console.log('🎉 Tournament finished!');
        setIsUpdating(true);
        
        const refreshTournament = async () => {
          try {
            const updatedTournament = await tournamentService.getTournament(tournamentId);
            console.log('✅ Tournament data refreshed from tournament completion');
            onTournamentUpdate?.(updatedTournament);
          } catch (error) {
            console.error('❌ Error refreshing tournament data:', error);
          } finally {
            setTimeout(() => setIsUpdating(false), 3000);
          }
        };
        refreshTournament();
      }
    };

    // Subscribe to WebSocket tournament updates
    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    // Cleanup on unmount
    return () => {
      webSocketService.leaveTournament(tournamentId);
      webSocketService.removeTournamentListeners();
    };
  }, [tournament?.id, tournament?._id, tournament?.isStarted, onTournamentUpdate]);
  
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
        return (
          <div key={roundIndex} className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">
              {roundIndex === tournament.rounds.length - 1 && tournament.rounds.length > 1
                ? 'Final'
                : roundIndex === tournament.rounds.length - 2 && tournament.rounds.length > 2
                ? 'Semi-Final'
                : `Round ${roundIndex + 1}`}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Regular Matches */}
              {round.matches.map((match: TournamentMatch, index: number) => (
                <MatchCard
                  key={match.matchId || `match-${roundIndex}-${index}`}
                  match={match}
                  tournamentId={tournamentId}
                  currentUserId={user?.id}
                  isOrganizer={isOrganizer}
                  onTournamentUpdate={onTournamentUpdate}
                />
              ))}
              
              {/* Bye Players */}
              {round.byePlayers && round.byePlayers.map((player: any, index: number) => (
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
      
      {/* Tournament Winner */}
      {tournament.isFinished && tournament.winnerId && (
        <div className="text-center py-8">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-6 max-w-md mx-auto shadow-lg">
            <div className="text-white">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-2xl font-bold mb-2">Tournament Champion</h2>
              <p className="text-xl">
                {tournament.players.find(p => p.id === tournament.winnerId)?.name || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentBracket; 