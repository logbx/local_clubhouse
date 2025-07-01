import { IsString, IsNumber, IsOptional, IsMongoId, Min, Max, IsEnum, IsArray } from 'class-validator';
import { TournamentType } from '../../models/tournament.model';

export class CreateTournamentDto {
  @IsString()
  name: string;

  @IsMongoId()
  eventId: string;

  @IsNumber()
  @Min(2)
  @Max(128)
  maxPlayers: number;

  @IsEnum(TournamentType)
  type: TournamentType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  numRounds?: number; // Optional for Single Elimination, required for Swiss (validated in controller)
}

export class RegisterPlayerDto {
  @IsMongoId()
  tournamentId: string;
}

export class AddGuestPlayerDto {
  @IsString()
  tournamentId: string;

  @IsString()
  name: string;
}

export class RemovePlayerDto {
  @IsString()
  tournamentId: string;

  @IsString()
  playerId: string;
}

export class StartTournamentDto {
  @IsMongoId()
  tournamentId: string;
}

export class ReportResultDto {
  @IsString()
  tournamentId: string;

  @IsString()
  matchId: string;

  @IsString()
  winnerId: string;

  @IsString()
  loserId: string;

  @IsString()
  result: 'win' | 'loss' | 'draw';
}

export class ConfirmResultDto {
  @IsMongoId()
  tournamentId: string;

  @IsString()
  matchId: string;
}

export class OverrideResultDto {
  @IsMongoId()
  tournamentId: string;

  @IsString()
  matchId: string;

  @IsString()
  winnerId: string;

  @IsString()
  loserId: string;

  @IsOptional()
  @IsString()
  status?: 'completed' | 'forfeit';
}

export class TournamentPlayerDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  points: number;

  @IsNumber()
  wins: number;

  @IsNumber()
  buchholzScore: number;

  @IsNumber()
  rank: number;
}

export class TournamentMatchDto {
  matchId: string;
  player1: TournamentPlayerDto;
  player2: TournamentPlayerDto;
  winnerId?: string;
  loserId?: string;
  status: 'pending' | 'completed' | 'forfeit';
  resultReportedBy: string[];
  confirmedBy?: string;
  result?: 'win' | 'loss' | 'draw';
  round?: number;
}

export class TournamentRoundDto {
  roundNumber: number;
  matches: TournamentMatchDto[];
  byePlayers?: TournamentPlayerDto[];
  isComplete?: boolean;
}

export class TournamentDto {
  id: string;
  name: string;
  eventId: string;
  organizerId: string;
  maxPlayers: number;
  players: TournamentPlayerDto[];
  rounds: TournamentRoundDto[];
  isStarted: boolean;
  isFinished: boolean;
  winnerId?: string;
  createdAt: Date;
  updatedAt: Date;
  type: TournamentType;
  numRounds?: number;
  currentRound?: number;
} 