import { Schema, Document, Types, model } from 'mongoose';

export type TournamentStatus = 'pending' | 'submitted' | 'confirmed' | 'disputed' | 'completed' | 'forfeit';

export enum TournamentType {
  SINGLE_ELIMINATION = 'single_elimination',
  SWISS = 'swiss'
}

export interface ITournamentPlayer {
  id: string; // userId if account exists, otherwise UUID
  name: string; // Display name (fullName for users, custom name for guests)
  fullName?: string; // User's full name (for registered users)
  username?: string; // User's username (for registered users)
  userId?: Types.ObjectId; // null for guest player
  isGuest: boolean;
  hasConfirmedWin?: boolean;
  hasReported?: boolean;
  registeredAt?: Date; // When the player registered
  // Swiss tournament specific fields
  points?: number; // Total points in Swiss tournament
  wins?: number; // Number of wins
  buchholzScore?: number; // Sum of opponents' scores
  pastOpponents?: string[]; // Array of opponent IDs faced
}

export interface ITournamentMatch {
  matchId: string;
  player1: ITournamentPlayer;
  player2: ITournamentPlayer;
  winnerId?: string;
  loserId?: string;
  status: TournamentStatus;
  resultReportedBy: string[]; // userId(s) that reported
  confirmedBy?: string; // userId that confirmed
  notes?: string; // Additional notes for the match result
  disputeReason?: string; // Reason for dispute
  disputedBy?: string; // userId that disputed
  resolvedBy?: string; // userId that resolved the dispute
  resolutionNotes?: string; // Notes from dispute resolution
  overriddenBy?: string; // userId that overrode the result
  overrideReason?: string; // Reason for override
  // Swiss tournament specific fields
  result?: 'win' | 'loss' | 'draw'; // Explicit result for Swiss tournaments
  isDraw?: boolean; // Whether the match was a draw
  round?: number; // Round number for this match
}

export interface ITournamentRound {
  roundNumber: number;
  name?: string; // Round name (e.g., "Quarter-Final", "Semi-Final", "Final")
  matches: ITournamentMatch[];
  byePlayers?: ITournamentPlayer[]; // Optional bye players for display
  isComplete?: boolean; // Whether all matches in this round are completed
}

export interface ITournament extends Document {
  _id: Types.ObjectId;
  name: string;
  eventId: Types.ObjectId;
  organizerId: Types.ObjectId;
  maxPlayers: number;
  players: ITournamentPlayer[];
  rounds: ITournamentRound[];
  isStarted: boolean;
  isFinished: boolean;
  registrationOpen: boolean;
  winnerId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Swiss tournament specific fields
  type: TournamentType;
  numRounds?: number; // Total number of rounds for Swiss tournament
  currentRound?: number; // Current round number
}

const TournamentPlayerSchema = new Schema<ITournamentPlayer>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  fullName: { type: String },
  username: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  isGuest: { type: Boolean, required: true },
  hasConfirmedWin: { type: Boolean, default: false },
  hasReported: { type: Boolean, default: false },
  registeredAt: { type: Date },
  // Swiss tournament specific fields
  points: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  buchholzScore: { type: Number, default: 0 },
  pastOpponents: [{ type: String }]
}, { _id: false });

const TournamentMatchSchema = new Schema<ITournamentMatch>({
  matchId: { type: String, required: true },
  player1: { type: TournamentPlayerSchema, required: true },
  player2: { type: TournamentPlayerSchema, required: true },
  winnerId: { type: String },
  loserId: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'submitted', 'confirmed', 'disputed', 'completed', 'forfeit'], 
    default: 'pending' 
  },
  resultReportedBy: [{ type: String }],
  confirmedBy: { type: String },
  notes: { type: String },
  disputeReason: { type: String },
  disputedBy: { type: String },
  resolvedBy: { type: String },
  resolutionNotes: { type: String },
  overriddenBy: { type: String },
  overrideReason: { type: String },
  // Swiss tournament specific fields
  result: { type: String, enum: ['win', 'loss', 'draw'] },
  isDraw: { type: Boolean, default: false },
  round: { type: Number }
}, { _id: false });

const TournamentRoundSchema = new Schema<ITournamentRound>({
  roundNumber: { type: Number, required: true },
  name: { type: String }, // Round name (e.g., "Quarter-Final", "Semi-Final", "Final")
  matches: [TournamentMatchSchema],
  byePlayers: [TournamentPlayerSchema], // Optional bye players for display
  isComplete: { type: Boolean, default: false }
}, { _id: false });

export const TournamentSchema = new Schema<ITournament>({
  name: { type: String, required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  maxPlayers: { type: Number, required: true, min: 2 },
  players: [TournamentPlayerSchema],
  rounds: [TournamentRoundSchema],
  isStarted: { type: Boolean, default: false },
  isFinished: { type: Boolean, default: false },
  registrationOpen: { type: Boolean, default: true },
  winnerId: { type: String },
  // Swiss tournament specific fields
  type: { type: String, enum: Object.values(TournamentType), default: TournamentType.SINGLE_ELIMINATION },
  numRounds: { 
    type: Number, 
    min: 1, 
    max: 10,
    // Custom validation for Swiss tournaments
    validate: {
      validator: function(this: ITournament, value: number) {
        // If this is a Swiss tournament, numRounds is required and must be >= 2
        if (this.type === TournamentType.SWISS) {
          return value && value >= 2 && value <= 10;
        }
        // For Single Elimination, numRounds is optional
        return true;
      },
      message: 'Swiss tournaments must have numRounds between 2 and 10'
    }
  },
  currentRound: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'tournaments', // Explicitly set collection name
  toObject: {
    transform: function(_, ret) {
      ret.id = ret._id.toString();
      return ret;
    }
  }
});

// Add pre-save middleware to validate Swiss tournament requirements
TournamentSchema.pre('save', function(next) {
  const tournament = this as ITournament;
  
  // Validate Swiss tournament numRounds
  if (tournament.type === TournamentType.SWISS) {
    if (!tournament.numRounds || tournament.numRounds < 2) {
      console.error('🚨 VALIDATION ERROR: Swiss tournament save blocked - invalid numRounds:', {
        tournamentId: tournament._id,
        name: tournament.name,
        type: tournament.type,
        numRounds: tournament.numRounds
      });
      return next(new Error(`Swiss tournament "${tournament.name}" must have numRounds >= 2, got: ${tournament.numRounds}`));
    }
    
    if (tournament.numRounds > 10) {
      console.error('🚨 VALIDATION ERROR: Swiss tournament save blocked - numRounds too high:', {
        tournamentId: tournament._id,
        name: tournament.name,
        numRounds: tournament.numRounds
      });
      return next(new Error(`Swiss tournament "${tournament.name}" cannot have more than 10 rounds, got: ${tournament.numRounds}`));
    }
  }
  
  // Additional validation: ensure currentRound is not greater than numRounds
  if (tournament.numRounds && tournament.currentRound && tournament.currentRound > tournament.numRounds) {
    console.warn('⚠️  VALIDATION WARNING: currentRound > numRounds, adjusting:', {
      tournamentId: tournament._id,
      name: tournament.name,
      currentRound: tournament.currentRound,
      numRounds: tournament.numRounds
    });
    tournament.currentRound = tournament.numRounds;
  }
  
  next();
});

// Add pre-update middleware to validate updates
TournamentSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function(next) {
  const update = this.getUpdate() as any;
  
  // If numRounds is being updated, validate it
  if (update.$set && 'numRounds' in update.$set) {
    const numRounds = update.$set.numRounds;
    
    // We can't easily access the tournament type in update middleware,
    // so we'll add a query filter to only allow valid numRounds
    if (numRounds !== undefined && (numRounds < 1 || numRounds > 10)) {
      console.error('🚨 UPDATE VALIDATION ERROR: Invalid numRounds in update:', {
        numRounds,
        updateQuery: this.getQuery()
      });
      return next(new Error(`Invalid numRounds: ${numRounds}. Must be between 1 and 10.`));
    }
  }
  
  next();
});

export const Tournament = model<ITournament>('Tournament', TournamentSchema); 