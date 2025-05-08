import { connect } from 'mongoose';
import { User } from '../models/user.model';
import { S3Service } from '../services/s3.service';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const s3Service = new S3Service();

async function migrateProfileImages() {
  try {
    // Connect to MongoDB
    await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/local-clubhouse');
    console.log('Connected to MongoDB');

    // Get all users with local profile images
    const users = await User.find({
      profileImage: { $regex: '^uploads/' }
    });

    console.log(`Found ${users.length} users with local profile images`);

    for (const user of users) {
      try {
        const oldPath = user.profileImage;
        if (!oldPath) continue;

        // Read the file
        const filePath = path.join(__dirname, '../../', oldPath);
        if (!fs.existsSync(filePath)) {
          console.log(`File not found for user ${user._id}: ${filePath}`);
          continue;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileExtension = path.extname(oldPath);
        const key = `profile-images/${user._id}/${Date.now()}${fileExtension}`;

        // Upload to S3
        await s3Service.uploadFile(fileBuffer, key, 'image/jpeg');
        const publicUrl = s3Service.getFileUrl(key);

        // Update user record
        user.profileImage = publicUrl;
        await user.save();

        // Delete local file
        fs.unlinkSync(filePath);

        console.log(`Migrated profile image for user ${user._id}`);
      } catch (error) {
        console.error(`Error migrating user ${user._id}:`, error);
      }
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateProfileImages(); 