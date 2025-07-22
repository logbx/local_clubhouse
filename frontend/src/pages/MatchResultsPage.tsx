import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tournament, TournamentMatch, tournamentService, TournamentType } from '../services/tournament.service';
import TournamentBracket from '../components/TournamentBracket';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { MatchResultModal } from '../components/MatchResultModal';
import { webSocketService } from '../services/websocket.service';

// Helper functions
const didUserSubmitResult = (match: TournamentMatch, userId: string): boolean => {
  if (!match.resultReportedBy) return false;
  return Array.isArray(match.resultReportedBy) 
    ? match.resultReportedBy.includes(userId)
    : match.resultReportedBy === userId;
};

export const MatchResultsPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId]);

  // WebSocket handling for real-time updates
  useEffect(() => {
    if (!tournament?.eventId) return undefined;

    console.log('🔌 Setting up WebSocket listeners for Results Page - Tournament:', tournamentId, 'Event:', tournament.eventId);
    
    // Join event chat to receive tournament updates
    webSocketService.joinEventChat(tournament.eventId);
    
    // Also join tournament-specific room for more targeted updates
    if (tournamentId) {
      webSocketService.joinTournament(tournamentId);
    }

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 Results Page WebSocket update received:', {
        type: data.type,
        tournamentId: data.tournamentId,
        ourTournamentId: tournamentId,
        fullData: data
      });
      
      // Check if this update is for our tournament
      if (data.tournamentId && data.tournamentId !== tournamentId) {
        console.log('🔕 Ignoring update for different tournament:', data.tournamentId);
        return;
      }
      
      // Handle tournament-related events that affect results
      if (data.type === 'match-result-submitted' || 
          data.type === 'match-result-confirmed' ||
          data.type === 'round-started' || 
          data.type === 'tournament-completed' ||
          data.type === 'tournament-repaired') {
        
        // Show notification for match results with more details
        if (data.type === 'match-result-submitted' && data.result) {
          const currentMatch = tournament?.rounds
            ?.flatMap(r => r.matches)
            ?.find(m => m.matchId === data.matchId);
          
          if (currentMatch) {
            const winnerName = currentMatch.player1.id === data.result.winnerId ? 
              currentMatch.player1.name : currentMatch.player2.name;
            
            toast.success(`🏆 Match result submitted - ${winnerName} won!`, {
              duration: 4000,
              position: 'top-right'
            });
          }
        }
        
        if (data.type === 'match-result-confirmed') {
          toast.success(`✅ Match result confirmed!`, {
            duration: 3000,
            position: 'top-right'
          });
        }
        
        if (data.type === 'round-started') {
          toast.success(`🚀 Next round has started!`, {
            duration: 4000,
            position: 'top-right'
          });
        }
        
        if (data.type === 'tournament-completed') {
          toast.success(`🏆 Tournament completed!`, {
            duration: 5000,
            position: 'top-right'
          });
        }
        
        // Refresh tournament data immediately for real-time updates
        console.log('🔄 Refreshing tournament data due to:', data.type);
        loadTournament();
      }
    };

    // Set up tournament update listener
    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    // Cleanup function
    return () => {
      webSocketService.removeTournamentListeners();
      if (tournamentId) {
        webSocketService.leaveTournament(tournamentId);
      }
    };
  }, [tournament?.eventId, tournamentId]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const tournamentData = await tournamentService.getTournament(tournamentId!);
      
      // Verify this is a Single Elimination tournament
      if (tournamentData.type !== TournamentType.SINGLE_ELIMINATION) {
        setError('This page is only for Single Elimination tournaments');
        return;
      }
      
      // Debug logging
      console.log('🏆 MatchResultsPage - Tournament loaded:', {
        tournamentId,
        tournamentName: tournamentData.name,
        organizerId: tournamentData.organizerId,
        currentUserId: user?.id,
        isCreator: tournamentData.organizerId === user?.id,
        rounds: tournamentData.rounds?.length || 0,
        totalMatches: tournamentData.rounds?.flatMap(r => r.matches).length || 0,
        winnerId: tournamentData.winnerId,
        isFinished: tournamentData.isFinished,
        isStarted: tournamentData.isStarted,
        players: tournamentData.players?.map(p => ({ id: p.id, name: p.name })) || []
      });
      
      setTournament(tournamentData);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResult = async (match: TournamentMatch, result: 'win' | 'loss') => {
    if (!tournament || !user) return;

    try {
      // Determine winner based on who submitted the result
      const isPlayer1 = match.player1.id === user.id;
      const winnerId = result === 'win' ? user.id : (isPlayer1 ? match.player2.id : match.player1.id);
      const loserId = result === 'win' ? (isPlayer1 ? match.player2.id : match.player1.id) : user.id;

      await tournamentService.submitMatchResult(tournament.id, match.matchId, winnerId, loserId, false);
      toast.success('Match result submitted successfully!');
      loadTournament(); // Refresh tournament data
    } catch (error) {
      console.error('Error submitting match result:', error);
      toast.error('Failed to submit match result');
    }
  };

  const openMatchResultModal = (match: TournamentMatch) => {
    setSelectedMatch(match);
    setShowResultModal(true);
  };

  const handleConfirmResult = async (match: TournamentMatch) => {
    if (!tournament || !user) return;
    try {
      await tournamentService.confirmMatchResult(tournament.id, match.matchId);
      toast.success('Match result confirmed!');
      loadTournament();
      setShowResultModal(false);
    } catch (error: any) {
      console.error('Error confirming match result:', error);
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Failed to confirm result';
        if (errorMessage.includes('already been completed') || 
            errorMessage.includes('Can only confirm submitted results')) {
          toast.error('This match has already been processed. Refreshing tournament data...');
          loadTournament(); // Force refresh
          setShowResultModal(false);
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error('Failed to confirm result. Please try again.');
      }
    }
  };

  const handleContestResult = async (match: TournamentMatch) => {
    if (!tournament || !user) return;
    // In a real application, you would open a dispute modal here
    // For now, we'll just show a toast
    toast.info('Dispute result functionality not yet implemented.');
    // Example: setSelectedMatch(match); setShowResultModal(true); // Open dispute modal
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">
            {error || 'Tournament not found'}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const allMatches = tournament.rounds?.flatMap(round => round.matches) || [];
  const userMatches = allMatches.filter(match => 
    match.player1.id === user?.id || match.player2.id === user?.id
  );
  
  // Determine winner and completion status from completed matches
  const determineWinner = () => {
    if (tournament.winnerId) {
      return tournament.winnerId;
    }
    
    // For single elimination, find the final match winner
    const finalRound = tournament.rounds?.find(round => 
      round.roundName?.toLowerCase().includes('final') || 
      round.roundNumber === tournament.rounds.length
    );
    
    if (finalRound) {
      const finalMatch = finalRound.matches?.find(match => 
        match.status === 'completed' && match.winnerId
      );
      
      if (finalMatch) {
        console.log('🏆 Found winner from final match:', {
          winnerId: finalMatch.winnerId,
          winnerName: tournament.players?.find(p => p.id === finalMatch.winnerId)?.name
        });
        return finalMatch.winnerId;
      }
    }
    
    return null;
  };
  
  const determineTournamentCompletion = () => {
    if (tournament.isFinished) {
      return true;
    }
    
    // For single elimination, check if final match is completed
    const finalRound = tournament.rounds?.find(round => 
      round.roundName?.toLowerCase().includes('final') || 
      round.roundNumber === tournament.rounds.length
    );
    
    if (finalRound) {
      const finalMatch = finalRound.matches?.find(match => 
        match.status === 'completed' && match.winnerId
      );
      
      if (finalMatch) {
        console.log('🏁 Tournament detected as completed based on final match');
        return true;
      }
    }
    
    return false;
  };
  
  const currentWinnerId = determineWinner();
  const isTournamentCompleted = determineTournamentCompletion();
  
  // Find current round - the round with pending/submitted matches OR where user has a bye
  const currentRound = tournament.rounds?.find(round => {
    // Check if user has matches in this round
    const hasMatch = round.matches.some(match => 
      (match.player1.id === user?.id || match.player2.id === user?.id ||
       match.player1.id === user?.id || match.player2.id === user?.id) && 
      (match.status === 'pending' || match.status === 'submitted')
    );
    
    // Check if user has a bye in this round
    const hasBye = (round.byePlayers || []).some(player => player.id === user?.id);
    
    // Check if this is an incomplete round (current active round)
    const isIncompleteRound = !round.isComplete;
    
    return hasMatch || (hasBye && isIncompleteRound);
  });
  
  const currentRoundMatches = currentRound ? currentRound.matches.filter(match => {
    // Check if user is in the match (check both id and userId fields)
    const isUserInMatch = match.player1.id === user?.id || match.player2.id === user?.id ||
                          match.player1.id === user?.id || match.player2.id === user?.id;
    if (!isUserInMatch) return false;
    
    // For pending matches, always show
    if (match.status === 'pending') return true;
    
    // For submitted matches, only show if user didn't submit the result
    if (match.status === 'submitted') {
      // Check if current user submitted the result (robust ID checking)
      const hasSubmittedResult = match.resultReportedBy && Array.isArray(match.resultReportedBy)
        ? match.resultReportedBy.some(reporterId => {
            if (!user?.id) return false;
            // Direct match with user.id
            if (reporterId === user.id) return true;
            // Try both string formats in case of ObjectId vs string mismatch
            if (reporterId === String(user.id)) return true;
            if (String(reporterId) === user.id) return true;
            // The User type only has 'id' field, not 'userId'
            return false;
          })
        : false;

      // Additional check: if the match is submitted and we're a player in the match,
      // we likely submitted it (fallback for race conditions)
      const isCreator = tournament?.organizerId === user?.id;
      const isLikelySubmitter = match.status === 'submitted' && 
        isUserInMatch &&
        !hasSubmittedResult && // Only if the primary check failed
        !isCreator; // Creators can submit on behalf of others

      const actuallySubmittedResult = hasSubmittedResult || isLikelySubmitter;
      
      // Debug logging
      console.log('🔍 MatchResultsPage - Current round match debug:', {
        matchId: match.matchId,
        userId: user?.id,
        userUserId: user?.id,
        player1Id: match.player1.id,
        player1UserId: match.player1.id,
        player2Id: match.player2.id,
        player2UserId: match.player2.id,
        resultReportedBy: match.resultReportedBy,
        hasSubmittedResult,
        isLikelySubmitter,
        actuallySubmittedResult,
        matchStatus: match.status,
        isUserInMatch
      });
      
      // Only show if user hasn't submitted the result
      return !actuallySubmittedResult;
    }
    
    return false;
  }) : [];

  // Check if user has a bye in the current round
  const userHasByeInCurrentRound = currentRound && (currentRound.byePlayers || []).some(player => player.id === user?.id);

  const renderCurrentRoundSection = () => {
    if (!tournament || tournament.isFinished || !user) return null;

    // Find matches in the current round that involve the user
    const currentRoundMatches = tournament.rounds
      ?.flatMap(round => round.matches)
      .filter(match => {
        const isUserInMatch = match.player1.id === user.id || match.player2.id === user.id;
        const isPendingOrSubmitted = match.status === 'pending' || match.status === 'submitted';
        return isUserInMatch && isPendingOrSubmitted;
      }) || [];

    if (currentRoundMatches.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Current Round
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your active matches requiring action
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {currentRoundMatches.map((match) => {
                const userSubmitted = didUserSubmitResult(match, user.id);
                const isSubmitted = match.status === 'submitted';

                return (
                  <div 
                    key={match.matchId} 
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex flex-col space-y-4">
                      {/* Match Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {match.player1.name} vs {match.player2.name}
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            isSubmitted 
                              ? userSubmitted
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-300'
                                : (match.player1.isGuest || match.player2.isGuest)
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300'
                          }`}>
                            {isSubmitted
                              ? userSubmitted
                                ? (match.player1.isGuest || match.player2.isGuest 
                                    ? 'Awaiting Organizer' 
                                    : 'Waiting for Opponent')
                                : (match.player1.isGuest || match.player2.isGuest
                                    ? 'Awaiting Organizer'
                                    : 'Needs Your Confirmation')
                              : 'Submit Your Result'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-2">
                        {isSubmitted ? (
                          userSubmitted ? (
                            // User submitted - show waiting message
                            <div className="text-sm text-orange-600 dark:text-orange-400">
                              {match.player1.isGuest || match.player2.isGuest 
                                ? 'Awaiting for organizer to confirm...'
                                : 'Waiting for opponent to confirm...'
                              }
                            </div>
                          ) : (
                            // Check if there's a guest player - only organizer can confirm results involving guests
                            (match.player1.isGuest || match.player2.isGuest) ? (
                              <div className="text-sm text-blue-600 dark:text-blue-400">
                                Awaiting for organizer to confirm...
                              </div>
                            ) : (
                              // Both registered players - show quick actions
                              <>
                                <button
                                  onClick={() => handleConfirmResult(match)}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  ✓ Accept Result
                                </button>
                                <button
                                  onClick={() => handleContestResult(match)}
                                  className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                                >
                                  ⚠ Contest Result
                                </button>
                              </>
                            )
                          )
                        ) : (
                          // Match is pending - show submit button
                          <button
                            onClick={() => openMatchResultModal(match)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Submit Result
                          </button>
                        )}
                        
                        {/* Always show details button */}
                        <button
                          onClick={() => openMatchResultModal(match)}
                          className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Match Results
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {tournament.name} • Single Elimination Tournament
              </p>
            </div>
          </div>
        </div>

        {/* Tournament Winner */}
        {console.log('🏆 Winner section debug:', {
          backendWinnerId: tournament.winnerId,
          currentWinnerId: currentWinnerId,
          backendIsFinished: tournament.isFinished,
          detectedIsCompleted: isTournamentCompleted,
          players: tournament.players?.map(p => ({ id: p.id, name: p.name })) || [],
          winnerPlayer: tournament.players?.find(p => p.id === currentWinnerId)
        })}
        {currentWinnerId && (
          <div className="mb-8">
            <div className={`bg-gradient-to-r rounded-lg p-6 border ${
              isTournamentCompleted 
                ? 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800' 
                : 'from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-3">
                    {isTournamentCompleted ? '🏆' : '👑'}
                  </div>
                  <div className="text-2xl font-bold mb-2">
                    <span className={isTournamentCompleted ? 'text-yellow-800 dark:text-yellow-200' : 'text-green-800 dark:text-green-200'}>
                      {tournament.players.find(p => p.id === currentWinnerId)?.name || 'Champion'}
                    </span>
                  </div>
                  <div className={`text-sm font-medium ${
                    isTournamentCompleted 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {isTournamentCompleted ? 'Tournament Champion' : 'Current Tournament Leader'}
                  </div>
                  {!isTournamentCompleted && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tournament still in progress
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Round Section */}
        {renderCurrentRoundSection()}

        {/* Tournament Matches */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6">
              <TournamentBracket 
                tournament={tournament} 
                onTournamentUpdate={(updatedTournament) => {
                  setTournament(updatedTournament);
                }}
                isManageMode={false}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedMatch && (
        <MatchResultModal
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setSelectedMatch(null);
          }}
          match={selectedMatch}
          currentUserId={user?.id || ''}
          isCreator={tournament?.organizerId === user?.id}
          onSubmitResult={async (winnerId, loserId, isDraw, notes) => {
            if (!tournament) return;
            console.log('Submitting match result:', { winnerId, loserId, isDraw, notes });
            await tournamentService.submitMatchResult(tournament.id, selectedMatch.matchId, winnerId, loserId, false, notes);
            toast.success('Match result submitted successfully!');
            loadTournament();
            setShowResultModal(false);
          }}
          onConfirmResult={async () => {
            if (!tournament || !selectedMatch) return;
            try {
              await tournamentService.confirmMatchResult(tournament.id, selectedMatch.matchId);
              toast.success('Match result confirmed!');
              loadTournament();
              setShowResultModal(false);
            } catch (error: any) {
              console.error('Error confirming match result:', error);
              if (error.response?.status === 400) {
                const errorMessage = error.response?.data?.message || 'Failed to confirm result';
                if (errorMessage.includes('already been completed') || 
                    errorMessage.includes('Can only confirm submitted results')) {
                  toast.error('This match has already been processed. Refreshing tournament data...');
                  loadTournament(); // Force refresh
                  setShowResultModal(false);
                } else {
                  toast.error(errorMessage);
                }
              } else {
                toast.error('Failed to confirm result. Please try again.');
              }
            }
          }}
          onDisputeResult={async (reason) => {
            if (!tournament || !selectedMatch) return;
            await tournamentService.disputeMatchResult(tournament.id, selectedMatch.matchId, reason);
            toast.success('Match result disputed');
            loadTournament();
            setShowResultModal(false);
          }}
          onResolveDispute={async (winnerId, loserId, isDraw, notes) => {
            if (!tournament || !selectedMatch) return;
            await tournamentService.resolveMatchDispute(tournament.id, selectedMatch.matchId, winnerId, loserId, false, notes);
            toast.success('Dispute resolved');
            loadTournament();
            setShowResultModal(false);
          }}
          onForfeit={async (forfeitingPlayerId) => {
            if (!tournament || !selectedMatch) return;
            await tournamentService.forfeitMatch(tournament.id, selectedMatch.matchId, forfeitingPlayerId);
            toast.success('Match forfeited');
            loadTournament();
            setShowResultModal(false);
          }}
          isSingleElimination={true}
        />
      )}
    </div>
  );
};

export default MatchResultsPage; 