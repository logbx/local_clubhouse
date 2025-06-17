import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
    roles: string[];
  };
}

@NestWebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class AppWebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AppWebSocketGateway.name);
  private onlineUsers = new Map<string, string>(); // userId -> socketId

  constructor(private configService: ConfigService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Setup authentication middleware
    server.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
        socket.user = {
          userId: decoded.sub || decoded.userId,
          email: decoded.email,
          roles: decoded.roles
        };
        
        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    if (client.user) {
      const userId = client.user.userId;
      this.onlineUsers.set(userId, client.id);
      
      // Join user-specific room
      client.join(`user:${userId}`);
      
      // Broadcast user online status
      this.server.emit('user-online', { userId });
      
      // Send current online users to the new connection
      client.emit('online-users', Array.from(this.onlineUsers.keys()));
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    if (client.user) {
      const userId = client.user.userId;
      this.onlineUsers.delete(userId);
      
      // Broadcast user offline status
      this.server.emit('user-offline', { userId });
    }
  }

  // Join a conversation room
  @SubscribeMessage('join-conversation')
  handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (client.user) {
      client.join(`conversation:${data.conversationId}`);
      this.logger.log(`User ${client.user.userId} joined conversation ${data.conversationId}`);
    }
  }

  // Leave a conversation room
  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (client.user) {
      client.leave(`conversation:${data.conversationId}`);
      this.logger.log(`User ${client.user.userId} left conversation ${data.conversationId}`);
    }
  }

  // Join an event chat room
  @SubscribeMessage('join-event-chat')
  handleJoinEventChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { eventId: string }
  ) {
    if (client.user) {
      client.join(`event:${data.eventId}`);
      this.logger.log(`User ${client.user.userId} joined event chat ${data.eventId}`);
    }
  }

  // Join a sub-group chat room
  @SubscribeMessage('join-subgroup-chat')
  handleJoinSubgroupChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { subGroupId: string }
  ) {
    if (client.user) {
      client.join(`subgroup:${data.subGroupId}`);
      this.logger.log(`User ${client.user.userId} joined sub-group chat ${data.subGroupId}`);
    }
  }

  // Join a tournament room
  @SubscribeMessage('join-tournament')
  handleJoinTournament(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tournamentId: string }
  ) {
    if (client.user) {
      client.join(`tournament:${data.tournamentId}`);
      this.logger.log(`User ${client.user.userId} joined tournament ${data.tournamentId}`);
    }
  }

  // Leave a tournament room
  @SubscribeMessage('leave-tournament')
  handleLeaveTournament(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tournamentId: string }
  ) {
    if (client.user) {
      client.leave(`tournament:${data.tournamentId}`);
      this.logger.log(`User ${client.user.userId} left tournament ${data.tournamentId}`);
    }
  }

  // Utility methods for broadcasting messages
  broadcastNewMessage(conversationId: string, message: any, excludeUserId?: string) {
    const roomName = `conversation:${conversationId}`;
    if (excludeUserId) {
      // Get all sockets in the room and broadcast to each except the sender
      const room = this.server.sockets.adapter.rooms.get(roomName);
      if (room) {
        room.forEach((socketId) => {
          const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
          if (socket && socket.user?.userId !== excludeUserId) {
            socket.emit('new-message', message);
          }
        });
      }
    } else {
      this.server.to(roomName).emit('new-message', message);
    }
  }

  broadcastNewEventMessage(eventId: string, message: any, excludeUserId?: string) {
    const roomName = `event:${eventId}`;
    if (excludeUserId) {
      // Get all sockets in the room and broadcast to each except the sender
      const room = this.server.sockets.adapter.rooms.get(roomName);
      if (room) {
        room.forEach((socketId) => {
          const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
          if (socket && socket.user?.userId !== excludeUserId) {
            socket.emit('new-event-message', message);
          }
        });
      }
    } else {
      this.server.to(roomName).emit('new-event-message', message);
    }
  }

  broadcastNewSubgroupMessage(subGroupId: string, message: any, excludeUserId?: string) {
    const roomName = `subgroup:${subGroupId}`;
    if (excludeUserId) {
      // Get all sockets in the room and broadcast to each except the sender
      const room = this.server.sockets.adapter.rooms.get(roomName);
      if (room) {
        room.forEach((socketId) => {
          const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
          if (socket && socket.user?.userId !== excludeUserId) {
            socket.emit('new-subgroup-message', message);
          }
        });
      }
    } else {
      this.server.to(roomName).emit('new-subgroup-message', message);
    }
  }

  broadcastFriendRequest(userId: string, friendRequest: any) {
    this.server.to(`user:${userId}`).emit('new-friend-request', friendRequest);
  }

  broadcastFriendRequestUpdate(userId: string, update: any) {
    this.server.to(`user:${userId}`).emit('friend-request-update', update);
  }

  // Tournament broadcasting methods
  broadcastTournamentUpdate(eventId: string, update: any, excludeUserId?: string) {
    const roomName = `event:${eventId}`;
    if (excludeUserId) {
      const room = this.server.sockets.adapter.rooms.get(roomName);
      if (room) {
        room.forEach((socketId) => {
          const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
          if (socket && socket.user?.userId !== excludeUserId) {
            socket.emit('tournament-update', update);
          }
        });
      }
    } else {
      this.server.to(roomName).emit('tournament-update', update);
    }
  }

  broadcastTournamentToParticipants(tournamentId: string, update: any, excludeUserId?: string) {
    const roomName = `tournament:${tournamentId}`;
    if (excludeUserId) {
      const room = this.server.sockets.adapter.rooms.get(roomName);
      if (room) {
        room.forEach((socketId) => {
          const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
          if (socket && socket.user?.userId !== excludeUserId) {
            socket.emit('tournament-update', update);
          }
        });
      }
    } else {
      this.server.to(roomName).emit('tournament-update', update);
    }
  }

  broadcastMatchUpdate(tournamentId: string, matchUpdate: any, excludeUserId?: string) {
    const roomName = `tournament:${tournamentId}`;
    if (excludeUserId) {
      const room = this.server.sockets.adapter.rooms.get(roomName);
      if (room) {
        room.forEach((socketId) => {
          const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
          if (socket && socket.user?.userId !== excludeUserId) {
            socket.emit('match-update', matchUpdate);
          }
        });
      }
    } else {
      this.server.to(roomName).emit('match-update', matchUpdate);
    }
  }
} 