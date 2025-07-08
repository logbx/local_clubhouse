// Quick script to fix the match IDs to match what the frontend expects
const { MongoClient } = require('mongodb');

async function fixMatchIds() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/localclubhouse');
  
  try {
    await client.connect();
    const db = client.db();
    const tournaments = db.collection('tournaments');
    
    const tournamentId = '68649f7f2c8f98b71674a9ad';
    const tournament = await tournaments.findOne({ _id: new require('mongodb').ObjectId(tournamentId) });
    
    if (tournament) {
      // Get Round 1 winners
      const round1 = tournament.rounds.find(r => r.roundNumber === 1);
      const winners = [];
      
      for (const match of round1.matches) {
        if (match.winnerId) {
          const winner = match.player1.id === match.winnerId ? match.player1 : match.player2;
          winners.push(winner);
        }
      }
      
      console.log('Winners from Round 1:', winners.map(w => w.name));
      
      // Update Round 2 with the frontend's expected match IDs
      const round2 = tournament.rounds.find(r => r.roundNumber === 2);
      if (round2 && winners.length >= 4) {
        round2.matches = [
          {
            matchId: '69cde572-7c4c-4684-bb47-d8eadb4837ad', // Frontend expects this ID
            player1: winners[0], // First winner
            player2: winners[1], // Second winner
            status: 'pending',
            resultReportedBy: []
          },
          {
            matchId: 'e3bf1a8e-8a8a-4bea-a5cb-e4deabe95ca7', // Frontend expects this ID
            player1: winners[2], // Third winner
            player2: winners[3], // Fourth winner
            status: 'pending',
            resultReportedBy: []
          }
        ];
        
        await tournaments.updateOne(
          { _id: new require('mongodb').ObjectId(tournamentId) },
          { $set: { rounds: tournament.rounds } }
        );
        
        console.log('Updated tournament with frontend-expected match IDs');
      }
    }
  } finally {
    await client.close();
  }
}

fixMatchIds().catch(console.error);