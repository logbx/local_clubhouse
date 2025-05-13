import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  }
}).single('profileImage');

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