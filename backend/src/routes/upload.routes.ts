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
    
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Handle file upload through the backend
router.post('/file', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('Processing file upload for user:', req.user?.id);
    
    if (!req.file) {
      console.error('No file provided in request');
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    if (!req.file.mimetype.startsWith('image/')) {
      console.error('Invalid file type:', req.file.mimetype);
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    const key = `uploads/${req.user?.id}/${uuidv4()}-${req.file.originalname}`;
    console.log('Generated file key:', key);

    await s3Service.uploadFile(req.file.buffer, key, req.file.mimetype);
    console.log('File uploaded successfully');

    const publicUrl = s3Service.getFileUrl(key);
    console.log('Generated public URL:', publicUrl);

    res.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Error in /file upload:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    // Handle specific error types
    if (error.message.includes('Missing required AWS environment variables')) {
      return res.status(500).json({ error: 'S3 configuration error. Please contact support.' });
    }
    
    if (error.message.includes('Failed to upload file to S3')) {
      return res.status(500).json({ error: 'Failed to upload file. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to process file upload' });
  }
});

export default router; 