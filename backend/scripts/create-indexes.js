// MongoDB indexes for optimal performance
const { MongoClient } = require('mongodb');

async function createOptimizedIndexes() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db();
  
  // User indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { sparse: true });
  await db.collection('users').createIndex({ 'friends': 1 });
  
  // Event indexes
  await db.collection('events').createIndex({ 'creator': 1 });
  await db.collection('events').createIndex({ 'visibility': 1, 'startDate': 1 });
  await db.collection('events').createIndex({ 'clubId': 1, 'startDate': 1 });
  await db.collection('events').createIndex({ 'tags': 1 });
  
  // Tournament indexes
  await db.collection('tournaments').createIndex({ 'eventId': 1 });
  await db.collection('tournaments').createIndex({ 'organizerId': 1 });
  await db.collection('tournaments').createIndex({ 'isStarted': 1, 'isFinished': 1 });
  await db.collection('tournaments').createIndex({ 'players.userId': 1 });
  
  // Message indexes for real-time chat
  await db.collection('messages').createIndex({ 'conversationId': 1, 'timestamp': -1 });
  await db.collection('messages').createIndex({ 'senderId': 1, 'timestamp': -1 });
  
  console.log('✅ All indexes created successfully');
  await client.close();
}

createOptimizedIndexes().catch(console.error);