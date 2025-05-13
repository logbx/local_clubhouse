import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Create multer instance without .single() to make it more flexible
const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('[UploadMiddleware] Processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
});

// Export middleware that handles both file upload and URL cases
export const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('[UploadMiddleware] Processing request:', {
    contentType: req.headers['content-type'],
    hasFile: req.headers['content-type']?.includes('multipart/form-data'),
    body: req.body
  });

  // If it's not a multipart request or if profileImage is already a URL, skip multer
  if (!req.headers['content-type']?.includes('multipart/form-data') || 
      (req.body && typeof req.body.profileImage === 'string' && req.body.profileImage.startsWith('http'))) {
    console.log('[UploadMiddleware] Skipping multer - not a multipart request or profileImage is already a URL');
    return next();
  }

  // Use multer for file upload
  multerInstance.single('profileImage')(req, res, (err) => {
    if (err) {
      console.error('[UploadMiddleware] Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'File too large',
            message: 'Maximum file size allowed is 5MB'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          console.log('[UploadMiddleware] Unexpected file field - request body:', req.body);
          // If it's an unexpected field error but we have a URL, continue
          if (req.body && typeof req.body.profileImage === 'string' && req.body.profileImage.startsWith('http')) {
            return next();
          }
        }
      }
      return res.status(400).json({
        error: 'File upload error',
        message: err.message
      });
    }
    next();
  });
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export const validateFileSize = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  
  if (contentLength > MAX_FILE_SIZE) {
    return res.status(413).json({
      error: 'File too large',
      message: 'Maximum file size allowed is 5MB'
    });
  }

  next();
};

export const validateFileType = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'];
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (!contentType || !allowedTypes.includes(contentType)) {
    return res.status(415).json({
      error: 'Invalid file type',
      message: 'Only JPEG, PNG, GIF, and WebP images are allowed'
    });
  }

  next();
}; 