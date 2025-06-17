import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { EmailService } from '../services/email.service';
import { Logger } from '@nestjs/common';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('AuthModule');
        const secret = configService.get<string>('JWT_ACCESS_SECRET');
        logger.debug(`JWT_ACCESS_SECRET from ConfigService: ${secret ? 'defined' : 'undefined'}`);
        
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET is not defined in environment variables');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '1h'),
          },
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 60000,
      limit: 10,
    }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    JwtStrategy,
    {
      provide: 'JWT_REFRESH_SECRET',
      useValue: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    },
    {
      provide: 'JWT_REFRESH_EXPIRATION',
      useValue: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
  ],
  exports: [AuthService, JwtModule, JwtStrategy],
})
export class AuthModule {} 