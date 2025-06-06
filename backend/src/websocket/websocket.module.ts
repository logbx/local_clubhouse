import { Module } from '@nestjs/common';
import { AppWebSocketGateway } from './websocket.gateway';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [AppWebSocketGateway],
  exports: [AppWebSocketGateway],
})
export class WebSocketModule {} 