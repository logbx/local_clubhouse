import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from '../controllers/search.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Event as EventModelSchema } from '../models/event.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: 'Event', schema: EventModelSchema.schema },
    ]),
  ],
  controllers: [SearchController],
})
export class SearchModule {} 