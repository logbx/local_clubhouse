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
      } else {
        // Fallback for missing creator info
        transformed.creator = { username: 'Unknown', email: '', id: '' };
        transformed.creatorId = '';
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
      
      // Ensure tags are properly formatted as an array
      if (transformed.tags) {
        if (typeof transformed.tags === 'string') {
          // If tags are stored as a string, try to parse as JSON or split by comma
          try {
            transformed.tags = JSON.parse(transformed.tags);
          } catch {
            transformed.tags = transformed.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
          }
        } else if (!Array.isArray(transformed.tags)) {
          transformed.tags = [];
        }

        // Handle nested stringified arrays (like ["[\"chess\",\"Social\"]"])
        let attempts = 0;
        while (Array.isArray(transformed.tags) && attempts < 5) {
          attempts++;
          let needsProcessing = false;
          
          for (let i = 0; i < transformed.tags.length; i++) {
            if (typeof transformed.tags[i] === 'string') {
              try {
                const parsed = JSON.parse(transformed.tags[i]);
                if (Array.isArray(parsed)) {
                  // Replace the stringified array with the actual array
                  transformed.tags.splice(i, 1, ...parsed);
                  needsProcessing = true;
                  break;
                }
              } catch {
                // Not a valid JSON string, keep as is
              }
            }
          }
          
          if (!needsProcessing) break;
        }

        // Ensure all tags are strings and filter out empty values
        transformed.tags = transformed.tags
          .flat() // Flatten any remaining nested arrays
          .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
          .map((tag: string) => tag.trim());
      } else {
        transformed.tags = [];
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
    } else {
      // Fallback for missing creator info
      transformed.creator = { username: 'Unknown', email: '', id: '' };
      transformed.creatorId = '';
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

    // Ensure tags are properly formatted as an array
    if (transformed.tags) {
      if (typeof transformed.tags === 'string') {
        try {
          transformed.tags = JSON.parse(transformed.tags);
        } catch {
          transformed.tags = transformed.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }
      } else if (!Array.isArray(transformed.tags)) {
        transformed.tags = [];
      }

      // Handle nested stringified arrays (like ["[\"chess\",\"Social\"]"])
      let attempts = 0;
      while (Array.isArray(transformed.tags) && attempts < 5) {
        attempts++;
        let needsProcessing = false;
        
        for (let i = 0; i < transformed.tags.length; i++) {
          if (typeof transformed.tags[i] === 'string') {
            try {
              const parsed = JSON.parse(transformed.tags[i]);
              if (Array.isArray(parsed)) {
                // Replace the stringified array with the actual array
                transformed.tags.splice(i, 1, ...parsed);
                needsProcessing = true;
                break;
              }
            } catch {
              // Not a valid JSON string, keep as is
            }
          }
        }
        
        if (!needsProcessing) break;
      }

      transformed.tags = transformed.tags
        .flat() // Flatten any remaining nested arrays
        .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.trim());
    } else {
      transformed.tags = [];
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
    transformedEvent.creatorId = transformedEvent.creator?._id || transformedEvent.creator?.id;
    
    // Ensure tags are properly formatted as an array
    if (transformedEvent.tags) {
      if (typeof transformedEvent.tags === 'string') {
        try {
          transformedEvent.tags = JSON.parse(transformedEvent.tags);
        } catch {
          transformedEvent.tags = transformedEvent.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }
      } else if (!Array.isArray(transformedEvent.tags)) {
        transformedEvent.tags = [];
      }

      // Handle nested stringified arrays (like ["[\"chess\",\"Social\"]"])
      let attempts = 0;
      while (Array.isArray(transformedEvent.tags) && attempts < 5) {
        attempts++;
        let needsProcessing = false;
        
        for (let i = 0; i < transformedEvent.tags.length; i++) {
          if (typeof transformedEvent.tags[i] === 'string') {
            try {
              const parsed = JSON.parse(transformedEvent.tags[i]);
              if (Array.isArray(parsed)) {
                // Replace the stringified array with the actual array
                transformedEvent.tags.splice(i, 1, ...parsed);
                needsProcessing = true;
                break;
              }
            } catch {
              // Not a valid JSON string, keep as is
            }
          }
        }
        
        if (!needsProcessing) break;
      }

      transformedEvent.tags = transformedEvent.tags
        .flat() // Flatten any remaining nested arrays
        .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
        .map((tag: string) => tag.trim());
    } else {
      transformedEvent.tags = [];
    }
    
    return { data: transformedEvent };
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() createEventDto: any) {
    const userId = req.user.sub || req.user.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    // Ensure tags are properly formatted before saving
    if (createEventDto.tags) {
      if (typeof createEventDto.tags === 'string') {
        try {
          createEventDto.tags = JSON.parse(createEventDto.tags);
        } catch {
          createEventDto.tags = createEventDto.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(createEventDto.tags)) {
        createEventDto.tags = [];
      }
      // Ensure all tags are strings and remove duplicates
      createEventDto.tags = [...new Set(
        createEventDto.tags
          .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
          .map((tag: string) => tag.trim())
      )];
    } else {
      createEventDto.tags = [];
    }

    // Ensure features are properly formatted before saving
    if (createEventDto.features) {
      if (typeof createEventDto.features === 'string') {
        try {
          createEventDto.features = JSON.parse(createEventDto.features);
        } catch {
          createEventDto.features = createEventDto.features.split(',').map((feature: string) => feature.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(createEventDto.features)) {
        createEventDto.features = [];
      }
      // Ensure all features are strings and remove duplicates
      createEventDto.features = [...new Set(
        createEventDto.features
          .filter((feature: any) => feature && typeof feature === 'string' && feature.trim().length > 0)
          .map((feature: string) => feature.trim())
      )];
    } else {
      createEventDto.features = [];
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
    // Ensure tags are properly formatted before updating
    if (updateEventDto.tags !== undefined) {
      if (typeof updateEventDto.tags === 'string') {
        try {
          updateEventDto.tags = JSON.parse(updateEventDto.tags);
        } catch {
          updateEventDto.tags = updateEventDto.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(updateEventDto.tags)) {
        updateEventDto.tags = [];
      }
      // Ensure all tags are strings and remove duplicates
      updateEventDto.tags = [...new Set(
        updateEventDto.tags
          .filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
          .map((tag: string) => tag.trim())
      )];
    }

    // Ensure features are properly formatted before updating
    if (updateEventDto.features !== undefined) {
      if (typeof updateEventDto.features === 'string') {
        try {
          updateEventDto.features = JSON.parse(updateEventDto.features);
        } catch {
          updateEventDto.features = updateEventDto.features.split(',').map((feature: string) => feature.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(updateEventDto.features)) {
        updateEventDto.features = [];
      }
      // Ensure all features are strings and remove duplicates
      updateEventDto.features = [...new Set(
        updateEventDto.features
          .filter((feature: any) => feature && typeof feature === 'string' && feature.trim().length > 0)
          .map((feature: string) => feature.trim())
      )];
    }

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