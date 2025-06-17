import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { redisService } from './redis.service';
import { UserRole } from '../users/schemas/user.schema';

// Extended socket interface with authenticated user
interface AuthSocket extends Socket {
  user?: {
    userId: string;
    roles: string[];
  };
}

// User presence tracking map
const onlineUsers = new Map<string, string>(); // userId -> socketId

// Setup WebSocket handlers
export const setupWebsocketHandlers = (io: Server) => {
  // Middleware for authentication
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      // Verify the JWT token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string; roles: string[]; email: string; sub: string };
      
      // Check if user session exists in Redis
      const sessionData = await redisService.getUserSession(decoded.userId);
      if (!sessionData) {
        return next(new Error('Invalid or expired token'));
      }
      
      // Attach user data to socket
      socket.user = {
        userId: decoded.userId,
        roles: decoded.roles
      };
      
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });
  
  // Connection handler
  io.on('connection', (socket: AuthSocket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Track user's online status if authenticated
    if (socket.user) {
      const userId = socket.user.userId;
      
      // Add user to online users
      onlineUsers.set(userId, socket.id);
      
      // Broadcast user's presence to everyone
      io.emit('user-online', { userId });
      
      // Update last seen status in Redis
      redisService.setUserLastSeen(userId, new Date().toISOString());
      
      // Send current online users to the new connection
      socket.emit('online-users', Array.from(onlineUsers.keys()));
    }
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      
      if (socket.user) {
        const userId = socket.user.userId;
        
        // Remove user from online users
        onlineUsers.delete(userId);
        
        // Update last seen status in Redis
        redisService.setUserLastSeen(userId, new Date().toISOString());
        
        // Broadcast user's offline status
        io.emit('user-offline', { userId });
      }
    });
    
    // Handle custom events
    socket.on('ping', (callback) => {
      callback({ status: 'pong', time: new Date().toISOString() });
    });
    
    // Join user-specific room for targeted messages
    if (socket.user) {
      socket.join(`user:${socket.user.userId}`);
    }
    
    // Admin-only chat room
    if (socket.user?.roles?.includes(UserRole.Creator)) {
      socket.join('admin-channel');
      socket.emit('admin-welcome', { message: 'Welcome to the admin channel' });
    }
  });
  
  // Setup Redis subscription for real-time notifications
  const setupRedisSubscription = async () => {
    const pubSubClient = redisService.getRedisClient();
    
    // Listen for messages on the notification channel
    const messageHandler = (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (channel === 'notifications') {
          // Handle user-specific notifications
          if (data.userId) {
            io.to(`user:${data.userId}`).emit('notification', data);
          } else {
            // Broadcast to all if no specific user
            io.emit('notification', data);
          }
        } else if (channel === 'system-events') {
          // System-wide events
          io.emit('system-event', data);
        }
      } catch (error) {
        console.error('Error processing Redis message:', error);
      }
    };

    await pubSubClient.subscribe('notifications', messageHandler);
    await pubSubClient.subscribe('system-events', messageHandler);
  };
  
  // Initialize Redis pub/sub
  setupRedisSubscription().catch(err => {
    console.error('Failed to setup Redis subscription:', err);
  });
  
  return io;
}; 