import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;

  constructor(
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  async broadcastToRoom(room: string, event: string, data: any) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized');
      return;
    }
    this.server.to(room).emit(event, data);
  }

  async joinRoom(socketId: string, room: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized');
      return;
    }
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      await socket.join(room);
      this.logger.log(`Socket ${socketId} joined room ${room}`);
    }
  }

  async leaveRoom(socketId: string, room: string) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized');
      return;
    }
    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      await socket.leave(room);
      this.logger.log(`Socket ${socketId} left room ${room}`);
    }
  }
} 