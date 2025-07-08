#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function verifyTournaments() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    const db = client.db('local-clubhouse');
    
    console.log('🔍 Verifying tournament collection setup...');
    
    // Check both collections
    const tournamentsCollection = db.collection('tournaments');
    const modelsCollection = db.collection('models');
    
    const tournamentsCount = await tournamentsCollection.countDocuments();
    const modelsCount = await modelsCollection.countDocuments();
    
    console.log(`📊 Collection status:`);
    console.log(`   - tournaments collection: ${tournamentsCount} documents`);
    console.log(`   - models collection: ${modelsCount} documents`);
    
    if (tournamentsCount > 0) {
      console.log('\n🏆 Sample tournaments in tournaments collection:');
      const sampleTournaments = await tournamentsCollection.find({}).limit(5).toArray();
      
      sampleTournaments.forEach((tournament, index) => {
        console.log(`   ${index + 1}. ${tournament.name} (${tournament.type || 'no type'}, ${tournament.players?.length || 0} players, ${tournament.rounds?.length || 0} rounds)`);
      });
    }
    
    // Show collection information from database perspective
    const collections = await db.listCollections().toArray();
    console.log('\n📂 All collections in database:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
    console.log('\n✅ Verification complete - tournaments are now stored in the "tournaments" collection');
    
  } catch (error) {
    console.error('❌ Verification error:', error);
  } finally {
    await client.close();
  }
}

verifyTournaments().catch(console.error);