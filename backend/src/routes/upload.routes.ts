import express, { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.middleware';
import { S3Service } from '../services/s3.service';

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: any;
  };
}

const router = express.Router();
const s3Service = new S3Service();

// Generate a signed URL for direct upload to S3
router.post('/signed-url', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('Generating presigned URL for user:', req.user?.id);
    const { fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
      console.error('Missing required fields:', { fileName, fileType });
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    if (!fileType.startsWith('image/')) {
      console.error('Invalid file type:', fileType);
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    const key = `profile-images/${req.user?.id}/${uuidv4()}-${fileName}`;
    console.log('Generated file key:', key);

    const { signedUrl, publicUrl } = await s3Service.generateUploadUrl(key, fileType);
    console.log('Generated URLs:', { signedUrl, publicUrl });

    res.json({ signedUrl, publicUrl, key });
    return;
  } catch (error: any) {
    console.error('Error in /signed-url:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      body: req.body
    });
    
    // Handle specific error types
    if (error.message.includes('Missing required AWS environment variables')) {
      return res.status(500).json({ error: 'S3 configuration error. Please contact support.' });
    }
    
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

export default router; 