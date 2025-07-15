import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tournament, TournamentMatch, tournamentService, TournamentType } from '../services/tournament.service';
import TournamentBracket from '../components/TournamentBracket';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { MatchResultModal } from '../components/MatchResultModal';

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
    match.player1.id === user?.id || match.player2.id === user?.id ||
    match.player1.userId === user?.id || match.player2.userId === user?.id
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
  
  // Find current round - the round with pending or submitted matches
  const currentRound = tournament.rounds?.find(round => 
    round.matches.some(match => 
      (match.player1.id === user?.id || match.player2.id === user?.id ||
       match.player1.userId === user?.id || match.player2.userId === user?.id) && 
      (match.status === 'pending' || match.status === 'submitted')
    )
  );
  
  const currentRoundMatches = currentRound ? currentRound.matches.filter(match => {
    // Check if user is in the match (check both id and userId fields)
    const isUserInMatch = match.player1.id === user?.id || match.player2.id === user?.id ||
                          match.player1.userId === user?.id || match.player2.userId === user?.id;
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
            // Also check against user.userId if available (some systems use different ID fields)
            if (user.userId && reporterId === user.userId) return true;
            if (user.userId && reporterId === String(user.userId)) return true;
            if (user.userId && String(reporterId) === user.userId) return true;
            return false;
          })
        : false;
      
      // Debug logging
      console.log('🔍 MatchResultsPage - Current round match debug:', {
        matchId: match.matchId,
        userId: user?.id,
        userUserId: user?.userId,
        player1Id: match.player1.id,
        player1UserId: match.player1.userId,
        player2Id: match.player2.id,
        player2UserId: match.player2.userId,
        resultReportedBy: match.resultReportedBy,
        hasSubmittedResult,
        matchStatus: match.status,
        isUserInMatch
      });
      
      // Only show if user hasn't submitted the result
      return !hasSubmittedResult;
    }
    
    return false;
  }) : [];

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

        {/* Current Round */}
        {currentRoundMatches.length > 0 && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Current Round
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentRound?.roundName || `Round ${currentRound?.roundNumber}`} - Matches requiring your input
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {currentRoundMatches.map((match, index) => (
                    <div key={match.matchId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            Match {index + 1}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {match.player1.name || 'Guest'}
                            </span>
                            <span className="text-gray-500">vs</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {match.player2.name || 'Guest'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            match.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                          }`}>
                            {match.status === 'pending' ? 'Awaiting Result' : 'Awaiting Confirmation'}
                          </span>
                          <button
                            onClick={() => openMatchResultModal(match)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            {match.status === 'pending' ? 'Submit Result' : 'Confirm/Dispute'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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