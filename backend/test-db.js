const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority';

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB!');
    
    // Try to find users
    const users = await mongoose.connection.db.collection('users').find({}).limit(1).toArray();
    console.log('Found users:', users.length);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

testConnection(); 