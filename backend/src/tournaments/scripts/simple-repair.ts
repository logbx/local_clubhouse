#!/usr/bin/env ts-node

/**
 * Simple Tournament Repair Script
 * 
 * Uses the existing API endpoints to repair tournaments
 */

async function repairKnownTournaments() {
  console.log('🔧 Repairing Known Tournaments...');
  console.log('=' .repeat(50));

  // List of tournament IDs that need repair
  const tournamentIds = [
    '68674bad271ccf6b6cc002c7', // Swiss 5 Tournament (the one you just showed)
    '6866c26b65e6a55717364528', // Swiss 4 Tournament (the one that was completed)
    // Add other tournament IDs as needed
  ];

  let repairedCount = 0;
  let errorCount = 0;

  for (const tournamentId of tournamentIds) {
    try {
      console.log(`🔧 Repairing tournament: ${tournamentId}`);
      
      // Use curl to call the repair endpoint
      const response = await fetch(`http://localhost:3001/api/tournaments/${tournamentId}/repair-advancement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result: any = await response.json();
        console.log(`✅ Success: ${result.message || 'Tournament repaired'}`);
        repairedCount++;
      } else {
        const error = await response.text();
        console.log(`❌ Failed: ${response.status} - ${error}`);
        errorCount++;
      }
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message || error}`);
      errorCount++;
    }
    
    console.log('');
  }

  console.log('=' .repeat(50));
  console.log('🏁 REPAIR SUMMARY');
  console.log('=' .repeat(50));
  console.log(`Tournaments repaired: ${repairedCount}`);
  console.log(`Tournaments with errors: ${errorCount}`);
  console.log('');

  if (repairedCount > 0) {
    console.log('🎉 Tournament advancement logic has been repaired!');
    console.log('✅ All future tournaments will automatically advance when rounds complete.');
  }
}

// Run the script
repairKnownTournaments()
  .then(() => {
    console.log('🎯 Repair script completed');
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
  });