const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.development' });

// Define the User schema directly here
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  fullName: { type: String, required: true },
  roles: [{ type: String, enum: ['Member', 'Admin', 'Organizer'], default: ['Member'] }],
  profileCompleted: { type: Boolean, default: false }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // Connect to MongoDB using URI from env file
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/local-clubhouse';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Delete existing test user if exists
    await User.deleteOne({ email: 'test@localclubhouse.com' });
    
    // Create test user
    const testUser = new User({
      email: 'test@localclubhouse.com',
      password: 'Test123!',
      username: 'testuser',
      fullName: 'Test User',
      roles: ['Member']
    });

    await testUser.save();
    console.log('Test user created successfully!');
    console.log('Email: test@localclubhouse.com');
    console.log('Password: Test123!');
    console.log('Username: testuser');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser(); 