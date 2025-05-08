import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';
import searchRoutes from './routes/search.routes';
import friendRoutes from './routes/friend.routes';
import uploadRoutes from './routes/upload.routes';
import messageRoutes from './routes/messages';
import eventMessageRoutes from './routes/eventMessages';
import groupMessageRoutes from './routes/groupMessages';
import eventSubGroupRoutes from './routes/eventSubGroups';
import friendGroupRoutes from './routes/friendGroups';
import { errorHandler } from './middleware/error.middleware';
import { setupWebsocketHandlers } from './services/websocket.service';
import { redisService } from './services/redis.service';
import { validationErrorHandler } from './middleware/validation.middleware';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/local-clubhouse';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://172.16.226.151:5173',
      'http://172.16.226.151:5174',
      process.env.CLIENT_URL || 'http://localhost:5173',
      origin // Allow the origin that made the request
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply global rate limiter to all requests
app.use(globalLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount routes under /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/event-messages', eventMessageRoutes);
app.use('/api/group-messages', groupMessageRoutes);
app.use('/api/event-sub-groups', eventSubGroupRoutes);
app.use('/api/friend-groups', friendGroupRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Local Clubhouse API is running' });
});

// Validation error handler
app.use(validationErrorHandler);

// Error handling middleware
app.use(errorHandler);

// Initialize services and start server
const initializeServices = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Initialize Redis service
    await redisService.initialize();
    console.log('Redis service initialized');

    // Setup WebSocket with Redis pub/sub
    setupWebsocketHandlers(io);
    console.log('WebSocket service initialized');

    // Start server
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start the application
initializeServices();

export default app; 