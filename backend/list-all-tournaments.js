#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function listAllTournaments() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    const db = client.db('local-clubhouse');
    const tournaments = db.collection('tournaments');
    
    // Find all tournaments
    const allTournaments = await tournaments.find({}).toArray();
    
    console.log(`🔍 Found ${allTournaments.length} tournaments total:`);
    
    for (const tournament of allTournaments) {
      console.log(`\n🏆 Tournament: ${tournament.name}`);
      console.log(`   ID: ${tournament._id}`);
      console.log(`   Type: ${tournament.type}`);
      console.log(`   Players: ${tournament.players.length}`);
      console.log(`   Rounds: ${tournament.rounds.length}`);
      console.log(`   Is Started: ${tournament.isStarted}`);
      console.log(`   Is Finished: ${tournament.isFinished}`);
      
      if (tournament.players.length > 0) {
        console.log(`   Player Names: ${tournament.players.map(p => p.name).join(', ')}`);
      }
    }
    
    // Group by type
    const byType = allTournaments.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Tournament Types:', byType);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

listAllTournaments().catch(console.error);