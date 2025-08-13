import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../src/models/user.model';

// Load environment variables
dotenv.config();

async function createOrUpdateUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/localclubhouse');
    console.log('Connected to MongoDB');

    const email = 'logan@localclubhouse.com';
    const password = 'Brocode8';
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (user) {
      console.log(`User ${email} already exists. Updating password...`);
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Update the password
      user.password = hashedPassword;
      await user.save();
      
      console.log(`✅ Password updated successfully`);
    } else {
      console.log(`User ${email} does not exist. Creating new user...`);
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create new user
      user = new User({
        username: 'logan',
        email: email,
        password: hashedPassword,
        roles: ['member'],
        interests: [],
        friends: [],
        sentRequests: [],
        receivedRequests: [],
        profileCompleted: false
      });
      
      await user.save();
      console.log(`✅ User created successfully`);
    }
    
    // Verify the password works
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password verification: ${isMatch ? 'PASSED' : 'FAILED'}`);
    
    console.log(`\nUser details:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Username: ${user.username}`);
    console.log(`Roles: ${user.roles.join(', ')}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
createOrUpdateUser();