import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { getModelToken } from '@nestjs/mongoose';
import { Event } from './schemas/event.schema';
import { Model } from 'mongoose';
import { EventVisibility, EventStatus } from './enums/event.enum';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

describe('EventsService', () => {
  let service: EventsService;
  let model: Model<Event>;

  const mockEvent = {
    _id: '683f9fc035c02a57c1d430c0',
    title: 'Test Event',
    description: 'Test Description',
    startTime: new Date('2025-06-05T17:00:00.000Z'),
    endTime: new Date('2025-06-05T19:00:00.000Z'),
    location: 'Test Location',
    cost: 0,
    isFree: true,
    visibility: EventVisibility.PUBLIC,
    status: EventStatus.LIVE,
    tags: ['test'],
    creatorId: '683f88420fb5406f07041b5d',
    creator: {
      _id: '683f88420fb5406f07041b5d',
      username: 'testuser'
    },
    rsvps: []
  };

  const mockEventModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    populate: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel
        }
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    model = module.get<Model<Event>>(getModelToken(Event.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEvent', () => {
    it('should create an event with creator information', async () => {
      const createEventDto: CreateEventDto = {
        title: 'New Event',
        description: 'New Description',
        startTime: new Date('2025-06-05T17:00:00.000Z'),
        endTime: new Date('2025-06-05T19:00:00.000Z'),
        location: 'New Location',
        visibility: EventVisibility.PUBLIC,
        status: EventStatus.DRAFT
      };

      const userId = '683f88420fb5406f07041b5d';

      mockEventModel.create.mockResolvedValue({
        ...createEventDto,
        _id: 'new-event-id',
        creatorId: userId,
        creator: {
          _id: userId,
          username: 'testuser'
        }
      });

      const result = await service.create(createEventDto, userId);

      expect(result.creatorId).toBe(userId);
      expect(result.creator._id).toBe(userId);
      expect(mockEventModel.create).toHaveBeenCalledWith({
        ...createEventDto,
        creatorId: userId
      });
    });
  });

  describe('findOne', () => {
    it('should return an event with creator information', async () => {
      const eventId = '683f9fc035c02a57c1d430c0';
      
      mockEventModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockEvent)
      });

      const result = await service.findOne(eventId);

      expect(result.creatorId).toBe(mockEvent.creatorId);
      expect(result.creator._id).toBe(mockEvent.creator._id);
      expect(mockEventModel.findById).toHaveBeenCalledWith(eventId);
    });

    it('should return null for non-existent event', async () => {
      const eventId = 'non-existent-id';
      
      mockEventModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      });

      const result = await service.findOne(eventId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should only allow creator to update event', async () => {
      const eventId = '683f9fc035c02a57c1d430c0';
      const userId = mockEvent.creatorId;
      const updateEventDto: UpdateEventDto = {
        title: 'Updated Title'
      };

      mockEventModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockEvent)
      });

      mockEventModel.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          ...mockEvent,
          ...updateEventDto
        })
      });

      const result = await service.update(eventId, updateEventDto, userId);

      expect(result.title).toBe(updateEventDto.title);
      expect(mockEventModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error when non-creator tries to update event', async () => {
      const eventId = '683f9fc035c02a57c1d430c0';
      const nonCreatorId = 'different-user-id';
      const updateEventDto: UpdateEventDto = {
        title: 'Updated Title'
      };

      mockEventModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockEvent)
      });

      await expect(service.update(eventId, updateEventDto, nonCreatorId))
        .rejects
        .toThrow('Unauthorized: Only the event creator can modify this event');
    });
  });

  describe('remove', () => {
    it('should only allow creator to delete event', async () => {
      const eventId = '683f9fc035c02a57c1d430c0';
      const userId = mockEvent.creatorId;

      mockEventModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockEvent)
      });

      mockEventModel.findByIdAndDelete.mockResolvedValue(mockEvent);

      const result = await service.remove(eventId, userId);

      expect(result).toBeDefined();
      expect(mockEventModel.findByIdAndDelete).toHaveBeenCalledWith(eventId);
    });

    it('should throw error when non-creator tries to delete event', async () => {
      const eventId = '683f9fc035c02a57c1d430c0';
      const nonCreatorId = 'different-user-id';

      mockEventModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockEvent)
      });

      await expect(service.remove(eventId, nonCreatorId))
        .rejects
        .toThrow('Unauthorized: Only the event creator can delete this event');
    });
  });
}); 