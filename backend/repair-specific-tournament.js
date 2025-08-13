/**
 * Repair the specific Swiss tournament using the repair endpoint
 */

const tournamentId = '6881028cdf09d36677e64af4';

async function repairTournament() {
  console.log('🔧 Repairing Swiss Tournament Advancement');
  console.log('=========================================');
  console.log('');
  console.log('Tournament ID:', tournamentId);
  console.log('');

  try {
    console.log('🔄 Calling repair endpoint...');
    
    const response = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/repair-advancement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS! Tournament repaired');
      console.log('Result:', result);
      
      console.log('');
      console.log('🎯 Next steps:');
      console.log('1. Refresh your tournament page: http://localhost:5173/tournament/swiss/6881028cdf09d36677e64af4/manage');
      console.log('2. You should now see Round 2 with new matches!');
      
    } else {
      const errorText = await response.text();
      console.log('❌ FAILED:', response.status, '-', errorText);
      
      if (response.status === 404) {
        console.log('');
        console.log('🤔 The repair endpoint might not exist. Let me try an alternative approach...');
        
        // Alternative: Try to get the tournament to trigger the diagnostic logic
        console.log('🔄 Trying alternative: Get tournament to trigger diagnostic logic...');
        const getTournamentResponse = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}`);
        
        if (getTournamentResponse.ok) {
          const tournament = await getTournamentResponse.json();
          console.log('✅ Tournament data retrieved');
          console.log('Current state:', {
            name: tournament.name,
            type: tournament.type,
            numRounds: tournament.numRounds,
            currentRound: tournament.currentRound,
            totalRounds: tournament.rounds?.length,
            round1Complete: tournament.rounds?.[0]?.isComplete
          });
          
          // The backend logs show the diagnostic is working, so our fix should be active
          console.log('');
          console.log('🎯 The fix is active in the backend. Try these steps:');
          console.log('1. Go to your tournament page');
          console.log('2. Click on any completed match (even if already reported)');
          console.log('3. Submit the result again - this will trigger advancement');
          
        } else {
          console.log('❌ Could not retrieve tournament data');
        }
      }
    }

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    
    console.log('');
    console.log('🎯 Manual fix instructions:');
    console.log('Since the API approach failed, you can manually trigger advancement by:');
    console.log('');
    console.log('1. Go to: http://localhost:5173/tournament/swiss/6881028cdf09d36677e64af4/manage');
    console.log('2. Find any completed match in Round 1');
    console.log('3. Click on the match result');
    console.log('4. Re-submit the same result (winner stays the same)');
    console.log('5. This will trigger the advancement logic with our fix');
    console.log('6. Round 2 should then be generated automatically');
  }

  console.log('');
  console.log('✅ Repair attempt completed');
}

// Run the repair
repairTournament();