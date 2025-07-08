#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function findTournaments() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    const db = client.db('local-clubhouse');
    const tournaments = db.collection('tournaments');
    
    // Find all Swiss tournaments
    const swissTournaments = await tournaments.find({ 
      type: 'swiss',
      isStarted: true
    }).toArray();
    
    console.log(`🔍 Found ${swissTournaments.length} Swiss tournaments:`);
    
    for (const tournament of swissTournaments) {
      console.log(`\n🏆 Tournament: ${tournament.name}`);
      console.log(`   ID: ${tournament._id}`);
      console.log(`   Players: ${tournament.players.length}`);
      console.log(`   Rounds: ${tournament.rounds.length}`);
      console.log(`   Current Round: ${tournament.currentRound || 1}`);
      console.log(`   Is Finished: ${tournament.isFinished}`);
      
      if (tournament.rounds.length > 0) {
        const currentRound = tournament.rounds[tournament.rounds.length - 1];
        console.log(`   Last Round Matches: ${currentRound.matches.length}`);
        
        // Check for undefined players
        const undefinedMatches = currentRound.matches.filter(match => 
          !match.player1?.name || !match.player2?.name
        );
        
        if (undefinedMatches.length > 0) {
          console.log(`   ❌ UNDEFINED PLAYERS FOUND: ${undefinedMatches.length} matches`);
          undefinedMatches.forEach((match, i) => {
            console.log(`      Match ${i+1}: ${match.player1?.name || 'undefined'} vs ${match.player2?.name || 'undefined'}`);
          });
        } else {
          console.log(`   ✅ All matches have valid players`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

findTournaments().catch(console.error);