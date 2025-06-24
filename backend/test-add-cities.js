const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/local-clubhouse';

async function addCitiesToClubs() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const clubsCollection = db.collection('clubs');
    
    // Sample cities with state abbreviations to add to clubs
    const sampleCities = [
      ['Austin, TX', 'Dallas, TX'],
      ['Houston, TX', 'San Antonio, TX'],
      ['Austin, TX', 'Houston, TX', 'Dallas, TX'],
      ['Fort Worth, TX', 'Arlington, TX'],
      ['Austin, TX'],
      ['Dallas, TX', 'Plano, TX', 'Frisco, TX'],
      ['Los Angeles, CA', 'San Diego, CA'],
      ['Chicago, IL', 'Aurora, IL'],
      ['Miami, FL', 'Tampa, FL'],
      ['Phoenix, AZ', 'Tucson, AZ'],
      ['Seattle, WA', 'Portland, OR'],
      ['New York, NY', 'Buffalo, NY'],
    ];
    
    // Get all clubs
    const clubs = await clubsCollection.find({}).toArray();
    console.log(`Found ${clubs.length} clubs`);
    
    // Add cities to each club
    for (let i = 0; i < clubs.length; i++) {
      const club = clubs[i];
      const citiesToAdd = sampleCities[i % sampleCities.length];
      
      await clubsCollection.updateOne(
        { _id: club._id },
        { 
          $set: { 
            activeCities: citiesToAdd 
          } 
        }
      );
      
      console.log(`Updated club "${club.name}" with cities: ${citiesToAdd.join(', ')}`);
    }
    
    console.log('✅ Successfully added formatted cities to all clubs!');
    console.log('📍 Cities now include state abbreviations (e.g., "Austin, TX")');
    
  } catch (error) {
    console.error('❌ Error adding cities:', error);
  } finally {
    await client.close();
  }
}

addCitiesToClubs(); 