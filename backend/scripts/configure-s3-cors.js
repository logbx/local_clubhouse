#!/usr/bin/env node

/**
 * Script to configure CORS for the S3 bucket
 * This script reads the CORS configuration from src/config/s3-cors.json
 * and applies it to the S3 bucket specified in environment variables
 */

const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load CORS configuration
const corsConfigPath = path.join(__dirname, '../src/config/s3-cors.json');
const corsConfig = JSON.parse(fs.readFileSync(corsConfigPath, 'utf8'));

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || 'localclubhouse-images';

async function getCurrentCors() {
  try {
    const command = new GetBucketCorsCommand({ Bucket: bucketName });
    const response = await s3Client.send(command);
    return response.CORSRules;
  } catch (error) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('No CORS configuration currently exists for the bucket');
      return null;
    }
    throw error;
  }
}

async function configureCors() {
  try {
    console.log('🔧 Configuring CORS for S3 bucket:', bucketName);
    console.log('📋 CORS Configuration:', JSON.stringify(corsConfig, null, 2));

    // Check current CORS configuration
    const currentCors = await getCurrentCors();
    if (currentCors) {
      console.log('📌 Current CORS configuration:', JSON.stringify(currentCors, null, 2));
    }

    // Apply new CORS configuration
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig,
    });

    await s3Client.send(command);
    console.log('✅ CORS configuration successfully applied to bucket:', bucketName);

    // Verify the configuration was applied
    const updatedCors = await getCurrentCors();
    console.log('📋 Updated CORS configuration:', JSON.stringify(updatedCors, null, 2));

  } catch (error) {
    console.error('❌ Error configuring CORS:', error);
    process.exit(1);
  }
}

// Run the configuration
configureCors();