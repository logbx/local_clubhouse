import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Event, IEvent, EventStatus } from '../models/event.model';
import { transformId, transformIds } from '../utils/transform.util';
import { Public } from '../auth/decorators/public.decorator';

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
    id?: string;
  };
}

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    @InjectModel('Event') private eventModel: Model<IEvent>
  ) {}

  @Get()
  async findAll() {
    const events = await this.eventModel
      .find()
      .populate('creator', 'username email profileImage')
      .lean()
      .exec();
    
    // Transform events to match frontend expectations
    const transformedEvents = events.map(event => {
      const transformed: any = transformId(event);
      
      // Ensure creator information is properly mapped
      if (transformed.creator && transformed.creator._id) {
        transformed.creatorId = transformed.creator._id.toString();
        transformed.creator.id = transformed.creator._id.toString();
      } else if (transformed.creator && transformed.creator.id) {
        transformed.creatorId = transformed.creator.id;
      }
      
      // Transform rsvps to match frontend expectations
      if (transformed.rsvps && Array.isArray(transformed.rsvps)) {
        transformed.rsvps = transformed.rsvps.map((rsvp: any) => ({
          id: rsvp._id ? rsvp._id.toString() : rsvp.toString(),
          username: rsvp.username || 'User',
          status: rsvp.status || 'going'
        }));
      } else {
        transformed.rsvps = [];
      }
      
      return transformed;
    });
    
    return { events: transformedEvents };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const event = await this.eventModel
      .findById(id)
      .populate('creator', 'username email profileImage')
      .lean()
      .exec();

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    
    const transformed: any = transformId(event);
    
    // Ensure creator information is properly mapped
    if (transformed.creator && transformed.creator._id) {
      transformed.creatorId = transformed.creator._id.toString();
      transformed.creator.id = transformed.creator._id.toString();
    } else if (transformed.creator && transformed.creator.id) {
      transformed.creatorId = transformed.creator.id;
    }
    
    // Transform rsvps to match frontend expectations
    if (transformed.rsvps && Array.isArray(transformed.rsvps)) {
      transformed.rsvps = transformed.rsvps.map((rsvp: any) => ({
        id: rsvp._id ? rsvp._id.toString() : rsvp.toString(),
        username: rsvp.username || 'User',
        status: rsvp.status || 'going'
      }));
    } else {
      transformed.rsvps = [];
    }
    
    return { event: transformed };
  }

  @Public()
  @Get('public/:id')
  async findPublicEvent(@Param('id') id: string) {
    const event = await this.eventModel
      .findById(id)
      .populate('creator', 'username email profileImage')
      .lean()
      .exec();

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Only return events with PUBLIC visibility
    if (event.visibility !== 'PUBLIC') {
      throw new NotFoundException('Event not available publicly');
    }

    // Transform the response to match frontend expectations
    const transformedEvent: any = transformId(event);
    
    // Add frontend-expected field mappings
    transformedEvent.creatorId = transformedEvent.organizerId || transformedEvent.creator?._id || transformedEvent.creator?.id;
    
    return { data: transformedEvent };
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() createEventDto: any) {
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    const createdEvent = await this.eventModel.create({
      ...createEventDto,
      creator: new Types.ObjectId(userId)
    });

    const populatedEvent = await createdEvent
      .populate('creator', 'username email profileImage');

    return { event: transformId(populatedEvent.toObject()) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateEventDto: any) {
    const updatedEvent = await this.eventModel
      .findByIdAndUpdate(id, updateEventDto, { new: true })
      .populate('creator', 'username email profileImage')
      .lean()
      .exec();

    if (!updatedEvent) {
      throw new NotFoundException('Event not found');
    }
    
    return { event: transformId(updatedEvent) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deletedEvent = await this.eventModel
      .findByIdAndDelete(id)
      .lean()
      .exec();

    if (!deletedEvent) {
      throw new NotFoundException('Event not found');
    }
    
    return { event: transformId(deletedEvent) };
  }

  @Post(':id/publish')
  async publishEvent(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    const event = await this.eventModel.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.creator.toString() !== userId) {
      throw new UnauthorizedException('Not authorized to publish this event');
    }

    event.status = 'LIVE' as EventStatus;
    await event.save();
    return { event: transformId(event.toObject()) };
  }

  @Post(':id/rsvp')
  async rsvpEvent(@Param('id') id: string, @Body() rsvpData: { status: string }, @Request() req: AuthenticatedRequest) {
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    const event = await this.eventModel.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Update RSVP logic here
    return { event: transformId(event.toObject()) };
  }
} 