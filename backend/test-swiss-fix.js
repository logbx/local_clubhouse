#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function testSwissFix() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    const db = client.db('local-clubhouse');
    const tournaments = db.collection('tournaments');
    
    // Find the problematic tournament
    const tournament = await tournaments.findOne({ 
      _id: { $in: [
        '686c2f863a48170820516959', // The new tournament ID from logs
        '6868666104360e20344cf90d'  // The original tournament ID
      ].map(id => { 
        try { 
          return require('mongodb').ObjectId.createFromHexString(id); 
        } catch { 
          return id; 
        } 
      })}
    });
    
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('🔍 Found tournament:', {
      id: tournament._id,
      name: tournament.name,
      type: tournament.type,
      players: tournament.players.length,
      rounds: tournament.rounds.length,
      isStarted: tournament.isStarted
    });
    
    console.log('👥 Players:', tournament.players.map(p => ({
      id: p.id,
      name: p.name,
      points: p.points || 0,
      wins: p.wins || 0,
      buchholz: p.buchholzScore || 0
    })));
    
    if (tournament.rounds.length > 0) {
      console.log('🎯 Current round matches:');
      const currentRound = tournament.rounds[tournament.rounds.length - 1];
      currentRound.matches.forEach(match => {
        console.log(`  ${match.player1?.name || 'undefined'} vs ${match.player2?.name || 'undefined'} (${match.status})`);
      });
      
      if (currentRound.byePlayers && currentRound.byePlayers.length > 0) {
        console.log('📋 Bye players:', currentRound.byePlayers.map(p => p.name));
      }
    }
    
    console.log('\n✅ Tournament structure analysis complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testSwissFix().catch(console.error);