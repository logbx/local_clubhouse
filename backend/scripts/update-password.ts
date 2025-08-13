import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../src/models/user.model';

// Load environment variables
dotenv.config();

async function updatePassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/localclubhouse');
    console.log('Connected to MongoDB');

    // Find the user
    const email = 'logan@localclubhouse.com';
    const newPassword = 'Brocode8';
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Set the new password directly - the pre-save hook will hash it
    user.password = newPassword;
    await user.save();
    
    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`New password: ${newPassword}`);
    
    // Verify the password works
    const isMatch = await bcrypt.compare(newPassword, user.password);
    console.log(`Password verification: ${isMatch ? 'PASSED' : 'FAILED'}`);
    
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
updatePassword();