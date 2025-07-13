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
    match.player1.id === user?.id || match.player2.id === user?.id
  );
  
  // Find current round - the round with pending or submitted matches
  const currentRound = tournament.rounds?.find(round => 
    round.matches.some(match => 
      (match.player1.id === user?.id || match.player2.id === user?.id) && 
      (match.status === 'pending' || match.status === 'submitted')
    )
  );
  
  const currentRoundMatches = currentRound ? currentRound.matches.filter(match => 
    (match.player1.id === user?.id || match.player2.id === user?.id) && 
    (match.status === 'pending' || match.status === 'submitted')
  ) : [];

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
        {tournament.isFinished && tournament.winnerId && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                    {tournament.players.find(p => p.id === tournament.winnerId)?.name || 'Champion'}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    Tournament Winner
                  </div>
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
                  {currentRound?.name || `Round ${currentRound?.round}`} - Matches requiring your input
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