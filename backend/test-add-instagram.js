const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Club schema (simplified for testing)
const ClubSchema = new mongoose.Schema({
  name: String,
  username: String,
  instagramHandle: String,
  // ... other fields
}, { timestamps: true });

const Club = mongoose.model('Club', ClubSchema);

async function addInstagramToClubs() {
  await connectDB();
  
  try {
    // Find all clubs without Instagram handles
    const clubs = await Club.find({ 
      $or: [
        { instagramHandle: { $exists: false } },
        { instagramHandle: '' },
        { instagramHandle: null }
      ]
    });

    console.log(`Found ${clubs.length} clubs without Instagram handles`);

    // Sample Instagram handles for testing
    const sampleHandles = [
      'nike',
      'adidas', 
      'oldmanrunclub',
      'strava',
      'runningwarehouse',
      'runnersworld',
      'marathonfoto',
      'trackandfield'
    ];

    // Add Instagram handles to first few clubs
    for (let i = 0; i < Math.min(clubs.length, 3); i++) {
      const club = clubs[i];
      const instagramHandle = sampleHandles[i % sampleHandles.length];
      
      await Club.updateOne(
        { _id: club._id },
        { $set: { instagramHandle: instagramHandle } }
      );
      
      console.log(`✅ Added Instagram handle @${instagramHandle} to club: ${club.name}`);
    }

    console.log('\n✨ Instagram handles added successfully!');
    console.log('📱 Visit your club pages to see the Instagram tab appear');
    
  } catch (error) {
    console.error('Error adding Instagram handles:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
if (require.main === module) {
  addInstagramToClubs();
}

module.exports = { addInstagramToClubs }; 