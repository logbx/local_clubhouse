/**
 * Force tournament advancement by calling the match result endpoint
 * This will trigger the performRoundAdvancement logic with our fix
 */

const axios = require('axios');

const TOURNAMENT_ID = '6881028cdf09d36677e64af4';
const API_BASE = 'http://localhost:3001/api';

async function forceTournamentAdvancement() {
  try {
    console.log('🔄 Forcing tournament advancement...');
    console.log('Tournament ID:', TOURNAMENT_ID);
    console.log('');
    
    // First, get the tournament data to see a completed match
    console.log('📊 Getting tournament data...');
    const tournamentResponse = await axios.get(`${API_BASE}/tournaments/${TOURNAMENT_ID}`);
    const tournament = tournamentResponse.data;
    
    console.log('Tournament found:', {
      name: tournament.name,
      type: tournament.type,
      numRounds: tournament.numRounds,
      currentRound: tournament.currentRound,
      totalRounds: tournament.rounds.length,
      round1Complete: tournament.rounds[0]?.isComplete
    });
    
    if (tournament.rounds.length === 0) {
      console.error('❌ No rounds found in tournament');
      return;
    }
    
    const round1 = tournament.rounds[0];
    if (!round1.matches || round1.matches.length === 0) {
      console.error('❌ No matches found in round 1');
      return;
    }
    
    // Find a completed match to "re-report"
    const completedMatch = round1.matches.find(m => m.status === 'completed');
    if (!completedMatch) {
      console.error('❌ No completed matches found');
      return;
    }
    
    console.log('🎯 Using completed match to trigger advancement:', {
      matchId: completedMatch.matchId,
      player1: completedMatch.player1.name,
      player2: completedMatch.player2.name,
      winner: completedMatch.winnerId
    });
    
    // Re-submit the match result to trigger advancement
    // This should call performRoundAdvancement with our fix
    const resultData = {
      tournamentId: TOURNAMENT_ID,
      matchId: completedMatch.matchId,
      winnerId: completedMatch.winnerId,
      loserId: completedMatch.loserId || (completedMatch.winnerId === completedMatch.player1.id ? completedMatch.player2.id : completedMatch.player1.id),
      result: 'win'
    };
    
    console.log('📝 Submitting match result to trigger advancement...');
    const submitResponse = await axios.post(`${API_BASE}/tournaments/submit-result`, resultData);
    
    console.log('✅ Match result submitted successfully!');
    console.log('Response:', submitResponse.data);
    
    // Wait a moment then check if round 2 was generated
    console.log('⏳ Waiting 2 seconds for advancement...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔍 Checking if round 2 was generated...');
    const updatedTournamentResponse = await axios.get(`${API_BASE}/tournaments/${TOURNAMENT_ID}`);
    const updatedTournament = updatedTournamentResponse.data;
    
    console.log('📊 Updated tournament state:', {
      totalRounds: updatedTournament.rounds.length,
      currentRound: updatedTournament.currentRound,
      rounds: updatedTournament.rounds.map(r => ({
        roundNumber: r.roundNumber,
        matchCount: r.matches.length,
        isComplete: r.isComplete
      }))
    });
    
    if (updatedTournament.rounds.length > 1) {
      console.log('🎉 SUCCESS! Round 2 has been generated!');
      const round2 = updatedTournament.rounds.find(r => r.roundNumber === 2);
      if (round2) {
        console.log('Round 2 details:', {
          roundNumber: round2.roundNumber,
          matchCount: round2.matches.length,
          isComplete: round2.isComplete,
          byePlayers: round2.byePlayers?.length || 0
        });
      }
    } else {
      console.log('❌ Round 2 was not generated. Something is still wrong.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
if (require.main === module) {
  console.log('🚀 Force Tournament Advancement Script');
  console.log('====================================');
  console.log('');
  
  forceTournamentAdvancement()
    .then(() => {
      console.log('');
      console.log('✅ Script completed');
      console.log('');
      console.log('🎯 Next steps:');
      console.log('1. Refresh your tournament page: http://localhost:5173/tournament/swiss/6881028cdf09d36677e64af4/manage');
      console.log('2. You should now see Round 2 with new matches!');
    })
    .catch(console.error);
}

module.exports = { forceTournamentAdvancement };