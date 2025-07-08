#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function migrateTournaments() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    const db = client.db('local-clubhouse');
    
    console.log('🔄 Starting tournament collection migration...');
    
    // Check if "models" collection exists and has tournament data
    const modelsCollection = db.collection('models');
    const tournamentsCollection = db.collection('tournaments');
    
    // Count documents in both collections
    const modelsCount = await modelsCollection.countDocuments();
    const tournamentsCount = await tournamentsCollection.countDocuments();
    
    console.log(`📊 Current state:`);
    console.log(`   - models collection: ${modelsCount} documents`);
    console.log(`   - tournaments collection: ${tournamentsCount} documents`);
    
    if (modelsCount === 0) {
      console.log('✅ No data to migrate from models collection');
      return;
    }
    
    // Get all documents from models collection that look like tournaments
    const modelsData = await modelsCollection.find({}).toArray();
    const tournamentData = modelsData.filter(doc => 
      doc.type && (doc.type === 'swiss' || doc.type === 'single_elimination') ||
      doc.players || doc.rounds || doc.eventId
    );
    
    console.log(`🔍 Found ${tournamentData.length} tournament documents in models collection`);
    
    if (tournamentData.length === 0) {
      console.log('✅ No tournament data found to migrate');
      return;
    }
    
    // Display tournament info before migration
    console.log('\n📋 Tournament data to migrate:');
    tournamentData.forEach((tournament, index) => {
      console.log(`   ${index + 1}. ${tournament.name || 'Unnamed'} (${tournament.type || 'unknown type'}, ${tournament.players?.length || 0} players)`);
    });
    
    // Insert into tournaments collection
    if (tournamentData.length > 0) {
      const result = await tournamentsCollection.insertMany(tournamentData, { ordered: false });
      console.log(`✅ Migrated ${result.insertedCount} tournaments to tournaments collection`);
      
      // Remove the tournament documents from models collection
      const tournamentIds = tournamentData.map(t => t._id);
      const deleteResult = await modelsCollection.deleteMany({ _id: { $in: tournamentIds } });
      console.log(`🗑️ Removed ${deleteResult.deletedCount} tournament documents from models collection`);
    }
    
    // Final count
    const finalTournamentsCount = await tournamentsCollection.countDocuments();
    const finalModelsCount = await modelsCollection.countDocuments();
    
    console.log(`\n✅ Migration completed:`);
    console.log(`   - tournaments collection: ${finalTournamentsCount} documents`);
    console.log(`   - models collection: ${finalModelsCount} documents`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
  }
}

migrateTournaments().catch(console.error);