import mongoose, { Schema, Document } from 'mongoose';

export interface ITournament extends Document {
  name: string;
  description: string;
  type: 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin';
  format: string; // Game/sport format
  status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
  maxPlayers: number;
  currentPlayers: number;
  startDate: Date;
  endDate?: Date;
  registrationDeadline: Date;
  entryFee: {
    amount: number;
    currency: string;
    required: boolean;
  };
  prizes: {
    position: number;
    description: string;
    value?: number;
    currency?: string;
  }[];
  settings: {
    allowLateRegistration: boolean;
    requireApproval: boolean;
    showLiveBracket: boolean;
    allowSpectators: boolean;
    randomizeSeeds: boolean;
    pointsForWin: number;
    pointsForDraw: number;
    pointsForLoss: number;
    tiebreakers: ('head_to_head' | 'buchholz' | 'points_diff' | 'games_won')[];
  };
  organizer: mongoose.Types.ObjectId;
  club?: mongoose.Types.ObjectId;
  venue?: {
    name: string;
    address: string;
    coordinates: [number, number];
  };
  rules: string;
  currentRound: number;
  totalRounds: number;
  isLive: boolean;
  stats: {
    totalMatches: number;
    completedMatches: number;
    averageMatchDuration: number;
    spectatorCount: number;
  };
  bracket?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 2000,
  },
  type: {
    type: String,
    enum: ['single_elimination', 'double_elimination', 'swiss', 'round_robin'],
    required: true,
  },
  format: {
    type: String,
    required: true,
    maxlength: 100,
  },
  status: {
    type: String,
    enum: ['draft', 'registration', 'active', 'completed', 'cancelled'],
    default: 'draft',
  },
  maxPlayers: {
    type: Number,
    required: true,
    min: 2,
    max: 1024,
  },
  currentPlayers: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  registrationDeadline: {
    type: Date,
    required: true,
  },
  entryFee: {
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  prizes: [{
    position: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      required: true,
    },
    value: Number,
    currency: String,
  }],
  settings: {
    allowLateRegistration: {
      type: Boolean,
      default: false,
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
    showLiveBracket: {
      type: Boolean,
      default: true,
    },
    allowSpectators: {
      type: Boolean,
      default: true,
    },
    randomizeSeeds: {
      type: Boolean,
      default: true,
    },
    pointsForWin: {
      type: Number,
      default: 3,
    },
    pointsForDraw: {
      type: Number,
      default: 1,
    },
    pointsForLoss: {
      type: Number,
      default: 0,
    },
    tiebreakers: [{
      type: String,
      enum: ['head_to_head', 'buchholz', 'points_diff', 'games_won'],
    }],
  },
  organizer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  club: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
  },
  venue: {
    name: String,
    address: String,
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  rules: {
    type: String,
    maxlength: 5000,
  },
  currentRound: {
    type: Number,
    default: 0,
  },
  totalRounds: {
    type: Number,
    default: 0,
  },
  isLive: {
    type: Boolean,
    default: false,
  },
  stats: {
    totalMatches: {
      type: Number,
      default: 0,
    },
    completedMatches: {
      type: Number,
      default: 0,
    },
    averageMatchDuration: {
      type: Number,
      default: 0,
    },
    spectatorCount: {
      type: Number,
      default: 0,
    },
  },
  bracket: {
    type: Schema.Types.ObjectId,
    ref: 'Bracket',
  },
}, {
  timestamps: true,
});

// Indexes
tournamentSchema.index({ status: 1, startDate: 1 });
tournamentSchema.index({ organizer: 1, startDate: -1 });
tournamentSchema.index({ club: 1, startDate: -1 });
tournamentSchema.index({ type: 1, status: 1 });
tournamentSchema.index({ 'venue.coordinates': '2dsphere' });
tournamentSchema.index({ name: 'text', description: 'text' });

export const Tournament = mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', tournamentSchema);

// Tournament Player Model
export interface ITournamentPlayer extends Document {
  tournament: mongoose.Types.ObjectId;
  player: mongoose.Types.ObjectId;
  seed: number;
  rating?: number;
  status: 'registered' | 'checked_in' | 'playing' | 'eliminated' | 'withdrawn';
  stats: {
    wins: number;
    losses: number;
    draws: number;
    points: number;
    gamesWon: number;
    gamesLost: number;
    buchholz?: number;
    tiebreakPoints?: number;
  };
  registeredAt: Date;
  checkedInAt?: Date;
  withdrawnAt?: Date;
  withdrawalReason?: string;
}

const tournamentPlayerSchema = new Schema<ITournamentPlayer>({
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  player: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seed: {
    type: Number,
    required: true,
  },
  rating: Number,
  status: {
    type: String,
    enum: ['registered', 'checked_in', 'playing', 'eliminated', 'withdrawn'],
    default: 'registered',
  },
  stats: {
    wins: {
      type: Number,
      default: 0,
    },
    losses: {
      type: Number,
      default: 0,
    },
    draws: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    gamesWon: {
      type: Number,
      default: 0,
    },
    gamesLost: {
      type: Number,
      default: 0,
    },
    buchholz: Number,
    tiebreakPoints: Number,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  checkedInAt: Date,
  withdrawnAt: Date,
  withdrawalReason: String,
}, {
  timestamps: true,
});

tournamentPlayerSchema.index({ tournament: 1, player: 1 }, { unique: true });
tournamentPlayerSchema.index({ tournament: 1, seed: 1 });
tournamentPlayerSchema.index({ tournament: 1, status: 1 });

export const TournamentPlayer = mongoose.models.TournamentPlayer || mongoose.model<ITournamentPlayer>('TournamentPlayer', tournamentPlayerSchema);

// Tournament Round Model
export interface ITournamentRound extends Document {
  tournament: mongoose.Types.ObjectId;
  roundNumber: number;
  name: string;
  status: 'pending' | 'active' | 'completed';
  startTime?: Date;
  endTime?: Date;
  isElimination: boolean;
  matches: mongoose.Types.ObjectId[];
  pairings: {
    player1: mongoose.Types.ObjectId;
    player2: mongoose.Types.ObjectId;
    tableNumber?: number;
  }[];
}

const tournamentRoundSchema = new Schema<ITournamentRound>({
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  roundNumber: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending',
  },
  startTime: Date,
  endTime: Date,
  isElimination: {
    type: Boolean,
    default: false,
  },
  matches: [{
    type: Schema.Types.ObjectId,
    ref: 'TournamentMatch',
  }],
  pairings: [{
    player1: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    player2: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    tableNumber: Number,
  }],
}, {
  timestamps: true,
});

tournamentRoundSchema.index({ tournament: 1, roundNumber: 1 }, { unique: true });
tournamentRoundSchema.index({ tournament: 1, status: 1 });

export const TournamentRound = mongoose.models.TournamentRound || mongoose.model<ITournamentRound>('TournamentRound', tournamentRoundSchema);

// Tournament Match Model
export interface ITournamentMatch extends Document {
  tournament: mongoose.Types.ObjectId;
  round: mongoose.Types.ObjectId;
  player1: mongoose.Types.ObjectId;
  player2?: mongoose.Types.ObjectId;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  result?: {
    winner: mongoose.Types.ObjectId;
    loser?: mongoose.Types.ObjectId;
    isDraw: boolean;
    score: {
      player1Score: number;
      player2Score: number;
      games?: {
        player1: number;
        player2: number;
      }[];
    };
    duration?: number; // in minutes
    notes?: string;
  };
  tableNumber?: number;
  startTime?: Date;
  endTime?: Date;
  reportedBy?: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  isLive: boolean;
  spectators: mongoose.Types.ObjectId[];
}

const tournamentMatchSchema = new Schema<ITournamentMatch>({
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  round: {
    type: Schema.Types.ObjectId,
    ref: 'TournamentRound',
    required: true,
  },
  player1: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  player2: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
  },
  result: {
    winner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    loser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isDraw: {
      type: Boolean,
      default: false,
    },
    score: {
      player1Score: {
        type: Number,
        default: 0,
      },
      player2Score: {
        type: Number,
        default: 0,
      },
      games: [{
        player1: Number,
        player2: Number,
      }],
    },
    duration: Number,
    notes: String,
  },
  tableNumber: Number,
  startTime: Date,
  endTime: Date,
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  isLive: {
    type: Boolean,
    default: false,
  },
  spectators: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

tournamentMatchSchema.index({ tournament: 1, round: 1 });
tournamentMatchSchema.index({ tournament: 1, status: 1 });
tournamentMatchSchema.index({ player1: 1, player2: 1, tournament: 1 });
tournamentMatchSchema.index({ isLive: 1 });

export const TournamentMatch = mongoose.models.TournamentMatch || mongoose.model<ITournamentMatch>('TournamentMatch', tournamentMatchSchema);

// Bracket Model for elimination tournaments
export interface IBracket extends Document {
  tournament: mongoose.Types.ObjectId;
  type: 'single_elimination' | 'double_elimination';
  structure: {
    rounds: {
      roundNumber: number;
      matches: {
        matchId: mongoose.Types.ObjectId;
        position: number;
        nextMatchPosition?: number;
        isWinnersBracket?: boolean;
      }[];
    }[];
    finalMatch?: mongoose.Types.ObjectId;
    thirdPlaceMatch?: mongoose.Types.ObjectId;
  };
  positions: {
    [key: string]: {
      x: number;
      y: number;
      round: number;
      matchId?: mongoose.Types.ObjectId;
    };
  };
}

const bracketSchema = new Schema<IBracket>({
  tournament: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['single_elimination', 'double_elimination'],
    required: true,
  },
  structure: {
    rounds: [{
      roundNumber: Number,
      matches: [{
        matchId: {
          type: Schema.Types.ObjectId,
          ref: 'TournamentMatch',
        },
        position: Number,
        nextMatchPosition: Number,
        isWinnersBracket: Boolean,
      }],
    }],
    finalMatch: {
      type: Schema.Types.ObjectId,
      ref: 'TournamentMatch',
    },
    thirdPlaceMatch: {
      type: Schema.Types.ObjectId,
      ref: 'TournamentMatch',
    },
  },
  positions: {
    type: Map,
    of: {
      x: Number,
      y: Number,
      round: Number,
      matchId: {
        type: Schema.Types.ObjectId,
        ref: 'TournamentMatch',
      },
    },
  },
}, {
  timestamps: true,
});

export const Bracket = mongoose.models.Bracket || mongoose.model<IBracket>('Bracket', bracketSchema);