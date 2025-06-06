import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '../shared/shared.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    SharedModule
  ],
  exports: [SharedModule],
})
export class RedisModule {} 