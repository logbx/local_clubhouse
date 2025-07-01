import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tournament, TournamentMatch, tournamentService, TournamentType } from '../services/tournament.service';
import SwissTournamentPairings from '../components/SwissTournamentPairings';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { MatchResultModal } from '../components/MatchResultModal';

export const SwissMatchResultsPage: React.FC = () => {
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
      
      // Verify this is a Swiss tournament
      if (tournamentData.type !== TournamentType.SWISS) {
        setError('This page is only for Swiss tournaments');
        return;
      }
      
      // Debug logging
      console.log('🏆 SwissMatchResultsPage - Tournament loaded:', {
        tournamentId,
        tournamentName: tournamentData.name,
        organizerId: tournamentData.organizerId,
        currentUserId: user?.id,
        isCreator: tournamentData.organizerId === user?.id,
        rounds: tournamentData.rounds?.length || 0,
        totalMatches: tournamentData.rounds?.flatMap(r => r.matches).length || 0,
      });
      
      setTournament(tournamentData);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResult = async (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => {
    if (!tournament || !user) return;

    try {
      let winnerId: string | null = null;
      let loserId: string | null = null;
      let isDraw = false;

      if (result === 'draw') {
        isDraw = true;
      } else {
        // Determine winner based on who submitted the result
        const isPlayer1 = match.player1.id === user.id;
        winnerId = result === 'win' ? user.id : (isPlayer1 ? match.player2.id : match.player1.id);
        loserId = result === 'win' ? (isPlayer1 ? match.player2.id : match.player1.id) : user.id;
      }

      await tournamentService.submitMatchResult(tournament.id, match.matchId, winnerId, loserId, isDraw);
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
    match.player1.id === user?.id || match.player2.id === user?.id
  );
  const pendingMatches = userMatches.filter(match => match.status === 'pending');
  const submittedMatches = userMatches.filter(match => match.status === 'submitted');
  const disputedMatches = userMatches.filter(match => match.status === 'disputed');
  const completedMatches = userMatches.filter(match => match.status === 'completed' || match.status === 'forfeit');

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
                {tournament.name} • Swiss Tournament
              </p>
            </div>
            <button
              onClick={() => navigate(`/tournament/swiss/${tournamentId}`)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Tournament
            </button>
          </div>
        </div>

        {/* Match Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{pendingMatches.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Your Pending Matches</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{submittedMatches.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Awaiting Confirmation</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{disputedMatches.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Disputed Results</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{completedMatches.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completed Matches</div>
          </div>
        </div>

        {/* Tournament Matches */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Your Tournament Matches
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Submit your match results or confirm your opponent's submissions • You can declare draws (0.5 points each)
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-8">
                {tournament.rounds.map((round, index) => (
                  <SwissTournamentPairings
                    key={index}
                    round={round}
                    currentRound={tournament.currentRound || 1}
                    totalRounds={tournament.numRounds || 3}
                    onReportResult={async (match, result) => {
                      openMatchResultModal(match);
                    }}
                    isOrganizer={false}
                    allowDraws={true}
                  />
                ))}
              </div>
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
            await tournamentService.submitMatchResult(tournament.id, selectedMatch.matchId, winnerId, loserId, isDraw, notes);
            toast.success('Match result submitted successfully!');
            loadTournament();
            setShowResultModal(false);
          }}
          onConfirmResult={async () => {
            if (!tournament || !selectedMatch) return;
            await tournamentService.confirmMatchResult(tournament.id, selectedMatch.matchId);
            toast.success('Match result confirmed!');
            loadTournament();
            setShowResultModal(false);
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
            await tournamentService.resolveMatchDispute(tournament.id, selectedMatch.matchId, winnerId, loserId, isDraw, notes);
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
          isSingleElimination={false}
        />
      )}
    </div>
  );
};

export default SwissMatchResultsPage; 