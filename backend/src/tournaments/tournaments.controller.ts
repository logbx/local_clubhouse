import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Delete,
  UnauthorizedException,
  InternalServerErrorException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TournamentsService } from './tournaments.service';
import { 
  CreateTournamentDto, 
  AddGuestPlayerDto, 
  RemovePlayerDto, 
  ReportResultDto, 
  ConfirmResultDto, 
  OverrideResultDto,
  TournamentPlayerDto
} from './dto/tournament.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Public } from '../auth/decorators/public.decorator';
import { TournamentType } from '../models/tournament.model';

interface AuthenticatedRequest {
  user: {
    sub: string;
    _id?: string;
    id?: string;
    username?: string;
    email?: string;
  };
}

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>
  ) {}

  // Temporary test endpoint without auth guard
  @Post('test-create')
  @HttpCode(HttpStatus.OK)
  async testCreateTournament(@Body() body: any) {
    console.log('🧪 Test tournament endpoint hit!', { body });
    return {
      success: true,
      message: 'Test endpoint working',
      data: { received: body },
    };
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createTournament(
    @Body() createTournamentDto: CreateTournamentDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Validate Swiss tournament requirements
    if (createTournamentDto.type === TournamentType.SWISS) {
      if (!createTournamentDto.numRounds) {
        throw new BadRequestException('Number of rounds is required for Swiss tournaments');
      }
      if (createTournamentDto.numRounds < 1 || createTournamentDto.numRounds > 10) {
        throw new BadRequestException('Number of rounds must be between 1 and 10');
      }
    }

    const tournament = await this.tournamentsService.createTournament(createTournamentDto, req.user.sub);
    return { data: tournament };
  }

  @Get('event/:eventId')
  async getTournamentByEvent(@Param('eventId') eventId: string) {
    const tournaments = await this.tournamentsService.getTournamentsByEvent(eventId);
    return { data: tournaments };
  }

  @Get('debug/available-events')
  async getAvailableEvents(@Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user.id;
      if (!userId) {
        throw new UnauthorizedException('User ID not found in token');
      }

      // Get events where the user is the creator (can create tournaments)
      const events = await this.eventModel.find({ creator: userId }, '_id title creator createdAt')
        .sort({ createdAt: -1 })
        .limit(20);

      return {
        success: true,
        data: {
          userId,
          availableEvents: events.map(event => ({
            id: event._id.toString(),
            title: event.title,
            creator: event.creator.toString()
          })),
          count: events.length,
          message: events.length > 0 ? 'Events found' : 'No events found for this user'
        }
      };
    } catch (error) {
      console.error('Error fetching available events:', error);
      throw new InternalServerErrorException('Failed to fetch available events');
    }
  }

  @Public()
  @Get('debug/events')
  async debugListEvents() {
    try {
      // Get all events to test if we can find them now
      const events = await this.eventModel.find({}, '_id title creator')
        .limit(10);

      return {
        success: true,
        message: 'Events found using correct schema',
        data: events.map(event => ({
          id: event._id.toString(),
          title: event.title,
          creator: event.creator.toString()
        })),
        count: events.length,
        searchingFor: '684b4297048914785f2ac51e',
        found: events.some(e => e._id.toString() === '684b4297048914785f2ac51e')
      };
    } catch (error) {
      console.error('Error fetching events for debug:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch events'
      };
    }
  }

  @Public()
  @Get('debug/tournaments/:eventId')
  async debugTournaments(@Param('eventId') eventId: string) {
    try {
      const tournaments = await this.tournamentsService.getTournamentsByEvent(eventId);
      return {
        success: true,
        eventId,
        tournaments: tournaments.map(tournament => ({
          id: tournament.id,
          name: tournament.name,
          players: tournament.players,
          playerCount: tournament.players.length,
          isStarted: tournament.isStarted,
          createdAt: tournament.createdAt
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get(':id')
  async getTournament(@Param('id') id: string) {
    const tournament = await this.tournamentsService.getTournament(id);
    return { data: tournament };
  }

  @Get(':id/enhanced')
  async getTournamentEnhanced(@Param('id') id: string) {
    return this.tournamentsService.getTournamentWithRoundNames(id);
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.OK)
  async registerPlayer(@Param('id') tournamentId: string, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      const username = req.user.username || 'User';
      const tournament = await this.tournamentsService.registerPlayer(
        tournamentId, 
        userId, 
        username
      );
      return {
        success: true,
        message: 'Successfully registered for tournament',
        data: tournament,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('add-guest')
  @HttpCode(HttpStatus.OK)
  async addGuestPlayer(@Body() addGuestPlayerDto: AddGuestPlayerDto, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      const tournament = await this.tournamentsService.addGuestPlayer(
        addGuestPlayerDto, 
        userId
      );
      return {
        success: true,
        message: 'Guest player added successfully',
        data: tournament,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('remove-player')
  @HttpCode(HttpStatus.OK)
  async removePlayer(@Body() removePlayerDto: RemovePlayerDto, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      const tournament = await this.tournamentsService.removePlayer(
        removePlayerDto, 
        userId
      );
      return {
        success: true,
        message: 'Player removed successfully',
        data: tournament,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async startTournament(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest
  ) {
    return this.tournamentsService.startTournament(id, req.user.sub);
  }

  @Post(':id/report-result')
  async reportResult(
    @Param('id') id: string,
    @Body() reportResultDto: ReportResultDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.tournamentsService.reportResult({
      ...reportResultDto,
      tournamentId: id
    }, req.user.sub);
  }

  @Get(':id/standings')
  async getStandings(@Param('id') id: string): Promise<TournamentPlayerDto[]> {
    return this.tournamentsService.getStandings(id);
  }

  @Post('confirm-result')
  @HttpCode(HttpStatus.OK)
  async confirmResult(@Body() confirmResultDto: any, @Request() req: AuthenticatedRequest) {
    console.log('🎯 CONFIRM RESULT ENDPOINT HIT!', {
      timestamp: new Date().toISOString(),
      body: confirmResultDto,
      hasUser: !!req.user,
      userInfo: req.user ? {
        sub: req.user.sub,
        id: req.user.id,
        _id: req.user._id
      } : null
    });
    
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        console.log('❌ No user ID found in request');
        throw new BadRequestException('User ID not found in request');
      }
      
      console.log('🔄 Calling tournamentsService.confirmMatchResult with:', {
        confirmResultDto,
        userId
      });
      
      const tournament = await this.tournamentsService.confirmMatchResult(
        confirmResultDto, 
        userId
      );
      
      console.log('✅ Match result confirmed successfully');
      return {
        success: true,
        message: 'Match result confirmed successfully',
        data: tournament,
      };
    } catch (error) {
      console.log('💥 Error in confirmResult controller:', error);
      throw error;
    }
  }

  @Post('override-result')
  @HttpCode(HttpStatus.OK)
  async overrideResult(@Body() overrideResultDto: OverrideResultDto, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      const tournament = await this.tournamentsService.overrideResult(
        overrideResultDto, 
        userId
      );
      return {
        success: true,
        message: 'Match result overridden successfully',
        data: tournament,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('submit-result')
  @HttpCode(HttpStatus.OK)
  async submitResult(@Body() submitResultDto: any, @Request() req: AuthenticatedRequest) {
    console.log('🎯 SUBMIT RESULT ENDPOINT HIT!', {
      timestamp: new Date().toISOString(),
      body: submitResultDto,
      hasUser: !!req.user,
      userInfo: req.user ? {
        sub: req.user.sub,
        id: req.user.id,
        _id: req.user._id
      } : null
    });
    
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        console.log('❌ No user ID found in request');
        throw new BadRequestException('User ID not found in request');
      }
      
      console.log('🔄 Calling tournamentsService.submitMatchResult with:', {
        submitResultDto,
        userId
      });
      
      const tournament = await this.tournamentsService.submitMatchResult(
        submitResultDto, 
        userId
      );
      
      console.log('✅ Match result submitted successfully');
      return {
        success: true,
        message: 'Match result submitted successfully',
        data: tournament,
      };
    } catch (error) {
      console.log('💥 Error in submitResult controller:', error);
      throw error;
    }
  }

  @Post('dispute-result')
  @HttpCode(HttpStatus.OK)
  async disputeResult(@Body() disputeResultDto: any, @Request() req: AuthenticatedRequest) {
    console.log('🎯 DISPUTE RESULT ENDPOINT HIT!', {
      timestamp: new Date().toISOString(),
      body: disputeResultDto,
      hasUser: !!req.user,
      userInfo: req.user ? {
        sub: req.user.sub,
        id: req.user.id,
        _id: req.user._id
      } : null
    });
    
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        console.log('❌ No user ID found in request');
        throw new BadRequestException('User ID not found in request');
      }
      
      console.log('🔄 Calling tournamentsService.disputeMatchResult with:', {
        disputeResultDto,
        userId
      });
      
      const tournament = await this.tournamentsService.disputeMatchResult(
        disputeResultDto, 
        userId
      );
      
      console.log('✅ Match result disputed successfully');
      return {
        success: true,
        message: 'Match result disputed successfully',
        data: tournament,
      };
    } catch (error) {
      console.log('💥 Error in disputeResult controller:', error);
      throw error;
    }
  }

  @Post('resolve-dispute')
  @HttpCode(HttpStatus.OK)
  async resolveDispute(@Body() resolveDisputeDto: any, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      const tournament = await this.tournamentsService.resolveMatchDispute(
        resolveDisputeDto, 
        userId
      );
      return {
        success: true,
        message: 'Match dispute resolved successfully',
        data: tournament,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('forfeit-match')
  @HttpCode(HttpStatus.OK)
  async forfeitMatch(@Body() forfeitMatchDto: any, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      const tournament = await this.tournamentsService.forfeitMatch(
        forfeitMatchDto, 
        userId
      );
      return {
        success: true,
        message: 'Match forfeited successfully',
        data: tournament,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteTournament(@Param('id') tournamentId: string, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      
      await this.tournamentsService.deleteTournament(tournamentId, userId);
      
      return {
        success: true,
        message: 'Tournament deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/open-registration')
  @HttpCode(HttpStatus.OK)
  async openRegistration(@Param('id') tournamentId: string, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      
      const tournament = await this.tournamentsService.openRegistration(tournamentId, userId);
      
      return {
        success: true,
        message: 'Registration opened successfully',
        data: tournament,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/close-registration')
  @HttpCode(HttpStatus.OK)
  async closeRegistration(@Param('id') tournamentId: string, @Request() req: AuthenticatedRequest) {
    try {
      const userId = req.user.sub || req.user._id || req.user.id;
      if (!userId) {
        throw new BadRequestException('User ID not found in request');
      }
      
      const tournament = await this.tournamentsService.closeRegistration(tournamentId, userId);
      
      return {
        success: true,
        message: 'Registration closed successfully',
        data: tournament,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/repair-byes')
  async repairTournamentByes(@Param('id') tournamentId: string) {
    return this.tournamentsService.repairTournamentByes(tournamentId);
  }
} 