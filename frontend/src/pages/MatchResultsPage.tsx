import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tournament, TournamentMatch, tournamentService } from '../services/tournament.service';
import TournamentBracket from '../components/TournamentBracket';
import { useAuth } from '../context/AuthContext';

export const MatchResultsPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const tournamentData = await tournamentService.getTournament(tournamentId!);
      
      // Debug logging for match results page
      console.log('🏆 MatchResultsPage - Tournament loaded:', {
        tournamentId,
        tournamentName: tournamentData.name,
        organizerId: tournamentData.organizerId,
        currentUserId: user?.id,
        isCreator: tournamentData.organizerId === user?.id,
        rounds: tournamentData.rounds?.length || 0,
        totalMatches: tournamentData.rounds?.flatMap(r => r.matches).length || 0
      });
      
      setTournament(tournamentData);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
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
  const pendingMatches = allMatches.filter(match => match.status === 'pending');
  const submittedMatches = allMatches.filter(match => match.status === 'submitted');
  const disputedMatches = allMatches.filter(match => match.status === 'disputed');
  const completedMatches = allMatches.filter(match => match.status === 'completed' || match.status === 'forfeit');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Match Results
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {tournament.name} • {tournament.players.length} players
              </p>
            </div>
            {/* Only show Back to Tournament button for tournament organizers */}
            {tournament.organizerId === user?.id && (
              <button
                onClick={() => navigate(`/tournament/${tournamentId}`)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Tournament
              </button>
            )}
          </div>
        </div>

        {/* Match Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{pendingMatches.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Matches</div>
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

        {/* Tournament Bracket with Integrated Result Submission */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Tournament Bracket
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click on any match to submit results, confirm outcomes, or manage disputes
              </p>
            </div>
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
    </div>
  );
}; 