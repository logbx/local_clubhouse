#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function checkDatabases() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    
    // List all databases
    const dbs = await client.db().admin().listDatabases();
    console.log('🗄️ Available databases:');
    dbs.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Check multiple database names
    const possibleDbNames = ['local-clubhouse', 'saas-app', 'clubhouse', 'test'];
    
    for (const dbName of possibleDbNames) {
      console.log(`\n🔍 Checking database: ${dbName}`);
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      
      if (collections.length > 0) {
        console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);
        
        // Check for tournaments specifically
        if (collections.find(c => c.name === 'tournaments')) {
          const tournaments = db.collection('tournaments');
          const count = await tournaments.countDocuments();
          console.log(`   Tournaments count: ${count}`);
          
          if (count > 0) {
            const sample = await tournaments.findOne();
            console.log(`   Sample tournament:`, {
              id: sample._id,
              name: sample.name,
              type: sample.type,
              players: sample.players?.length || 0
            });
          }
        }
      } else {
        console.log(`   (empty database)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkDatabases().catch(console.error);