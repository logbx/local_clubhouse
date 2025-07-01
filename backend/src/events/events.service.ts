import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IEvent } from '../models/event.model';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel('Event') private eventModel: Model<IEvent>,
  ) {}

  // Add service methods here as needed
  // For now, this is just a placeholder to fix the import error
} 