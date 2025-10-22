# S3 CORS Configuration Guide

This guide explains how to configure CORS (Cross-Origin Resource Sharing) for the AWS S3 bucket used by the LocalClubhouse application.

## Overview

The S3 bucket needs proper CORS configuration to allow Flutter web applications running on `localhost:8080` to upload and access images directly.

## CORS Configuration File

The CORS configuration is stored in `/backend/src/config/s3-cors.json`. This file defines:

- **Allowed Origins**: The domains that can access the S3 bucket
- **Allowed Methods**: HTTP methods allowed (GET, PUT, POST, DELETE)
- **Allowed Headers**: Headers that can be sent in requests
- **Exposed Headers**: Headers that the browser can access from the response
- **Max Age**: How long the browser can cache the CORS preflight response

## Current Configuration

The CORS configuration includes the following allowed origins:
- `http://localhost:5173` - Frontend development server
- `http://localhost:3000` - Backend development server
- `http://localhost:8080` - Flutter web development server
- `https://localclubhouse.com` - Production domain
- `https://www.localclubhouse.com` - Production domain with www

## Applying CORS Configuration

### Prerequisites

1. Ensure you have AWS credentials configured in your environment:
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_REGION=us-east-2
   export AWS_S3_BUCKET_NAME=localclubhouse-images
   ```

2. Or have them in your `.env` file in the backend directory.

### Running the Configuration Script

1. Navigate to the backend directory:
   ```bash
   cd /Applications/Projects/saas-app/backend
   ```

2. Install dependencies if not already installed:
   ```bash
   npm install
   ```

3. Run the CORS configuration script:
   ```bash
   node scripts/configure-s3-cors.js
   ```

   The script will:
   - Read the CORS configuration from `src/config/s3-cors.json`
   - Display the current CORS configuration (if any)
   - Apply the new CORS configuration
   - Verify the configuration was applied successfully

### Verifying CORS Configuration

You can verify the CORS configuration was applied correctly by:

1. Running the configuration script again - it will show the current configuration
2. Testing uploads from your Flutter web application at `http://localhost:8080`
3. Checking the browser's developer console for CORS errors

## Troubleshooting

### Common Issues

1. **Access Denied Error**
   - Ensure your AWS credentials have the necessary permissions to manage bucket CORS
   - Required permission: `s3:PutBucketCORS` and `s3:GetBucketCORS`

2. **CORS Errors in Browser**
   - Check that the origin in the error message is included in the allowed origins
   - Ensure the HTTP method is allowed
   - Verify the bucket name is correct

3. **Configuration Not Taking Effect**
   - CORS changes may take a few minutes to propagate
   - Clear browser cache and try again
   - Ensure you're applying the configuration to the correct bucket

### Adding New Origins

To add a new origin:

1. Edit `/backend/src/config/s3-cors.json`
2. Add the new origin to the `AllowedOrigins` array
3. Run the configuration script to apply changes

## Security Considerations

- Only add trusted origins to the CORS configuration
- In production, avoid using wildcard (`*`) origins
- Regularly review and update the allowed origins list
- Remove development origins when deploying to production

## Related Files

- `/backend/src/config/s3-cors.json` - CORS configuration file
- `/backend/src/config/s3.ts` - S3 client configuration
- `/backend/src/services/s3.service.ts` - S3 service implementation
- `/backend/scripts/configure-s3-cors.js` - Script to apply CORS configuration