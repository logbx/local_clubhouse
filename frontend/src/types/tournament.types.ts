interface TournamentMatch {
  matchId: string;
  player1: { id: string; name: string };
  player2: { id: string; name: string };
  status: 'pending' | 'submitted' | 'completed' | 'disputed';
  resultReportedBy: string | string[]; // Can be either a single ID or array of IDs
  // ... other fields
} 