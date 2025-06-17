import { IsString, IsNumber, IsOptional, IsMongoId, Min, Max } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  name: string;

  @IsMongoId()
  eventId: string;

  @IsNumber()
  @Min(2)
  @Max(128)
  maxPlayers: number;
}

export class RegisterPlayerDto {
  @IsMongoId()
  tournamentId: string;
}

export class AddGuestPlayerDto {
  @IsMongoId()
  tournamentId: string;

  @IsString()
  name: string;
}

export class RemovePlayerDto {
  @IsMongoId()
  tournamentId: string;

  @IsString()
  playerId: string;
}

export class StartTournamentDto {
  @IsMongoId()
  tournamentId: string;
}

export class ReportResultDto {
  @IsMongoId()
  tournamentId: string;

  @IsString()
  matchId: string;

  @IsString()
  winnerId: string;

  @IsString()
  loserId: string;
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
  id: string;
  name: string;
  userId?: string;
  isGuest: boolean;
  hasConfirmedWin?: boolean;
  hasReported?: boolean;
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
}

export class TournamentRoundDto {
  roundNumber: number;
  matches: TournamentMatchDto[];
  byePlayers?: TournamentPlayerDto[];
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
} 