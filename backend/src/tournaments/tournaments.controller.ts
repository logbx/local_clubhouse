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
  @Public()
  @Post('test-create')
  @HttpCode(HttpStatus.OK)
  async testCreateTournament(@Body() body: any) {
    console.log('🧪 Test tournament endpoint hit!', { body });
    
    try {
      // Test the validation logic
      const testDto: CreateTournamentDto = {
        name: body.name || 'Test Tournament',
        eventId: body.eventId || '684b4297048914785f2ac51e',
        maxPlayers: body.maxPlayers || 8,
        type: body.type || TournamentType.SWISS,
        numRounds: body.numRounds || 3
      };
      
      console.log('🧪 Validating DTO:', testDto);
      
      // Test validation
      if (testDto.type === TournamentType.SWISS) {
        if (!testDto.numRounds) {
          throw new BadRequestException('Number of rounds is required for Swiss tournaments');
        }
        if (testDto.numRounds < 1 || testDto.numRounds > 10) {
          throw new BadRequestException('Number of rounds must be between 1 and 10');
        }
      }
      
      return {
        success: true,
        message: 'Validation passed successfully',
        data: { 
          received: body,
          validated: testDto,
          validationType: testDto.type
        },
      };
    } catch (error) {
      console.error('🧪 Test validation failed:', error);
      return {
        success: false,
        message: 'Validation failed',
        error: error.message,
        data: { received: body }
      };
    }
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createTournament(
    @Body() createTournamentDto: CreateTournamentDto,
    @Request() req: AuthenticatedRequest
  ) {
    console.log('🏆 Tournament creation request received:', {
      body: createTournamentDto,
      userId: req.user.sub,
      type: createTournamentDto.type,
      numRounds: createTournamentDto.numRounds
    });

    // Validate Swiss tournament requirements
    if (createTournamentDto.type === TournamentType.SWISS) {
      console.log('🏆 Validating Swiss tournament - numRounds:', createTournamentDto.numRounds);
      if (!createTournamentDto.numRounds) {
        console.error('❌ Swiss tournament validation failed: numRounds is missing');
        throw new BadRequestException('Number of rounds is required for Swiss tournaments');
      }
      if (createTournamentDto.numRounds < 1 || createTournamentDto.numRounds > 10) {
        throw new BadRequestException('Number of rounds must be between 1 and 10');
      }
    }

    try {
      console.log('🚀 Calling tournamentsService.createTournament...');
      const tournament = await this.tournamentsService.createTournament(createTournamentDto, req.user.sub);
      console.log('✅ Tournament created successfully:', { id: tournament.id, name: tournament.name });
      return { data: tournament };
    } catch (error) {
      console.error('❌ Tournament creation failed in service:', error);
      throw error;
    }
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
    
    // General tournament debug info
    console.log('🔍 Tournament Debug Info:', {
      tournamentId: id,
      type: tournament.type,
      isStarted: tournament.isStarted,
      roundsLength: tournament.rounds?.length || 0
    });
    
    // Debug logging for Swiss tournaments to help diagnose frontend issue
    if (tournament.type === TournamentType.SWISS) {
      console.log('🏆 Swiss Tournament Debug Info:', {
        tournamentId: id,
        isStarted: tournament.isStarted,
        currentRound: tournament.currentRound,
        totalRounds: tournament.rounds.length,
        roundsData: tournament.rounds.map(round => ({
          roundNumber: round.roundNumber,
          matchCount: round.matches.length,
          isComplete: round.isComplete,
          firstMatchSample: round.matches[0] ? {
            matchId: round.matches[0].matchId,
            player1: round.matches[0].player1?.name,
            player2: round.matches[0].player2?.name,
            status: round.matches[0].status
          } : null
        }))
      });
    }
    
    // Transform tournament to ensure proper DTO structure for frontend
    const transformedTournament = {
      ...tournament.toObject(),
      rounds: tournament.rounds.map(round => ({
        ...round,
        matches: round.matches.map(match => ({
          ...match,
          // Ensure matchId is explicitly preserved
          matchId: match.matchId,
          // Ensure status is in the expected format for frontend
          status: match.status === 'submitted' || match.status === 'confirmed' || match.status === 'disputed' 
            ? 'pending' 
            : match.status,
          // Ensure player structure is simplified for frontend
          player1: {
            id: match.player1.id,
            name: match.player1.name,
            points: match.player1.points || 0,
            wins: match.player1.wins || 0,
            buchholzScore: match.player1.buchholzScore || 0,
            rank: 0,
            isGuest: match.player1.isGuest || false
          },
          player2: {
            id: match.player2.id,
            name: match.player2.name,
            points: match.player2.points || 0,
            wins: match.player2.wins || 0,
            buchholzScore: match.player2.buchholzScore || 0,
            rank: 0,
            isGuest: match.player2.isGuest || false
          }
        }))
      }))
    };
    
    return { data: transformedTournament };
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
    try {
      console.log('🚀 Starting tournament:', id, 'by user:', req.user.sub);
      const result = await this.tournamentsService.startTournament(id, req.user.sub);
      console.log('✅ Tournament started successfully');
      return result;
    } catch (error) {
      console.error('❌ Error starting tournament:', error);
      throw error;
    }
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
    console.log('🎯 OVERRIDE RESULT ENDPOINT HIT!', {
      timestamp: new Date().toISOString(),
      body: overrideResultDto,
      bodyKeys: Object.keys(overrideResultDto),
      bodyType: typeof overrideResultDto,
      rawBody: JSON.stringify(overrideResultDto),
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
      
      console.log('🔄 Calling tournamentsService.overrideResult with:', {
        overrideResultDto,
        userId,
        dtoValidation: {
          tournamentId: overrideResultDto.tournamentId,
          matchId: overrideResultDto.matchId,
          hasWinnerId: 'winnerId' in overrideResultDto,
          hasLoserId: 'loserId' in overrideResultDto,
          result: overrideResultDto.result,
          status: overrideResultDto.status
        }
      });
      
      const tournament = await this.tournamentsService.overrideResult(
        overrideResultDto, 
        userId
      );
      
      console.log('✅ Match result overridden successfully');
      return {
        success: true,
        message: 'Match result overridden successfully',
        data: tournament,
      };
    } catch (error) {
      console.log('💥 Error in overrideResult controller:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        statusCode: error.statusCode || error.status
      });
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

  @Public()
  @Post(':id/repair-pairings')
  @HttpCode(HttpStatus.OK)
  async repairTournamentPairings(@Param('id') tournamentId: string) {
    try {
      console.log('🔧 Repairing tournament pairings for:', tournamentId);
      const result = await this.tournamentsService.repairTournamentPairings(tournamentId);
      console.log('✅ Tournament pairings repaired successfully');
      return {
        success: true,
        message: 'Tournament pairings repaired successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error repairing tournament pairings:', error);
      return {
        success: false,
        message: 'Failed to repair tournament pairings',
        error: error.message
      };
    }
  }


  @Public()
  @Post(':id/force-next-round')
  @HttpCode(HttpStatus.OK)
  async forceNextRound(@Param('id') tournamentId: string) {
    try {
      console.log('🚀 Forcing next round generation for:', tournamentId);
      const result = await this.tournamentsService.forceNextRound(tournamentId);
      console.log('✅ Next round generated successfully');
      return {
        success: true,
        message: 'Next round generated successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error generating next round:', error);
      return {
        success: false,
        message: 'Failed to generate next round',
        error: error.message
      };
    }
  }

  @Public()
  @Post(':id/fix-swiss-round2')
  @HttpCode(HttpStatus.OK)
  async fixSwissRound2(@Param('id') tournamentId: string) {
    try {
      console.log('🔧 Fixing Swiss Round 2 pairings for:', tournamentId);
      const result = await this.tournamentsService.fixSwissRound2(tournamentId);
      console.log('✅ Swiss Round 2 fixed successfully');
      return {
        success: true,
        message: 'Swiss Round 2 fixed successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error fixing Swiss Round 2:', error);
      return {
        success: false,
        message: 'Failed to fix Swiss Round 2',
        error: error.message
      };
    }
  }

  @Public()
  @Post(':id/manual-swiss-round2')
  @HttpCode(HttpStatus.OK)
  async manualSwissRound2(@Param('id') tournamentId: string) {
    try {
      console.log('🔧 Manually creating Swiss Round 2 for:', tournamentId);
      const result = await this.tournamentsService.manualSwissRound2(tournamentId);
      console.log('✅ Manual Swiss Round 2 created successfully');
      return {
        success: true,
        message: 'Manual Swiss Round 2 created successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error creating manual Swiss Round 2:', error);
      return {
        success: false,
        message: 'Failed to create manual Swiss Round 2',
        error: error.message
      };
    }
  }

  @Public()
  @Post(':id/manual-swiss-round3')
  @HttpCode(HttpStatus.OK)
  async manualSwissRound3(@Param('id') tournamentId: string) {
    try {
      console.log('🔧 Manually creating Swiss Round 3 for:', tournamentId);
      const result = await this.tournamentsService.manualSwissRound3(tournamentId);
      console.log('✅ Manual Swiss Round 3 created successfully');
      return {
        success: true,
        message: 'Manual Swiss Round 3 created successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error creating manual Swiss Round 3:', error);
      return {
        success: false,
        message: 'Failed to create manual Swiss Round 3',
        error: error.message
      };
    }
  }

  @Post(':id/next-round')
  @HttpCode(HttpStatus.OK)
  async startNextRound(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest
  ) {
    try {
      console.log('🚀 Starting next round for tournament:', id, 'by user:', req.user.sub);
      const result = await this.tournamentsService.startNextRound(id, req.user.sub);
      console.log('✅ Next round started successfully');
      return result;
    } catch (error) {
      console.error('❌ Error starting next round:', error);
      throw error;
    }
  }

  @Post(':id/repair-advancement')
  @HttpCode(HttpStatus.OK)
  async repairTournamentAdvancement(@Param('id') tournamentId: string) {
    try {
      console.log('🔧 Repairing tournament advancement for:', tournamentId);
      const result = await this.tournamentsService.repairTournamentAdvancement(tournamentId);
      console.log('✅ Tournament advancement repaired successfully');
      return {
        success: true,
        message: 'Tournament advancement repaired successfully',
        data: result
      };
    } catch (error) {
      console.error('❌ Error repairing tournament advancement:', error);
      return {
        success: false,
        message: 'Failed to repair tournament advancement',
        error: error.message
      };
    }
  }
} 