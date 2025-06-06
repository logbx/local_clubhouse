import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { WebSocketService } from '../websocket/websocket.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisService, WebSocketService],
  exports: [RedisService, WebSocketService],
})
export class SharedModule {} 