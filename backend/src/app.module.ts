import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { SearchModule } from './search/search.module';
import { EventMessagesModule } from './event-messages/event-messages.module';
import { EventSubGroupsModule } from './event-subgroups/event-subgroups.module';
import { FriendsModule } from './friends/friends.module';
import { FriendGroupsModule } from './friend-groups/friend-groups.module';
import { GroupMessagesModule } from './group-messages/group-messages.module';
import { MessagesModule } from './messages/messages.module';
import { UploadModule } from './modules/upload.module';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { SharedModule } from './shared/shared.module';
import { ClubsModule } from './clubs/clubs.module';
import { InstagramModule } from './instagram/instagram.module';
import { EventMessage, EventMessageSchema } from './models/eventMessage.model';
import { EventMessageService } from './services/eventMessage.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', `.env.${process.env.NODE_ENV || 'development'}`),
        join(__dirname, '..', '.env'),
      ],
      cache: true,
      load: [
        () => {
          const logger = new Logger('ConfigModule');
          const env = process.env.NODE_ENV || 'development';
          logger.debug(`Loading environment from .env.${env}`);
          logger.debug(`Environment variables loaded:`, {
            NODE_ENV: process.env.NODE_ENV,
            MONGODB_URI: process.env.MONGODB_URI ? 'defined' : 'undefined',
            JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ? 'defined' : 'undefined',
            JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? 'defined' : 'undefined',
            PORT: process.env.PORT,
            CLIENT_URL: process.env.CLIENT_URL
          });
          return {};
        },
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 10,
    }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    RedisModule,
    WebSocketModule,
    AuthModule,
    UsersModule,
    EventsModule,
    TournamentsModule,
    SearchModule,
    EventMessagesModule,
    EventSubGroupsModule,
    FriendsModule,
    FriendGroupsModule,
    GroupMessagesModule,
    MessagesModule,
    UploadModule,
    HealthModule,
    SharedModule,
    ClubsModule,
    InstagramModule,
    MongooseModule.forFeature([
      { name: EventMessage.name, schema: EventMessageSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService, EventMessageService],
  exports: [EventMessageService],
})
export class AppModule {}
