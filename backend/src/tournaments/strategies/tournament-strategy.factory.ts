import { Injectable } from '@nestjs/common';
import { TournamentType } from '../../models/tournament.model';
import { TournamentStrategy } from './tournament-strategy.interface';
import { SingleEliminationFixedStrategy } from './single-elimination-fixed.strategy';
import { SwissTournamentStrategy } from './swiss-tournament.strategy';

@Injectable()
export class TournamentStrategyFactory {
  private strategies = new Map<TournamentType, TournamentStrategy>();

  constructor(
    private readonly singleEliminationStrategy: SingleEliminationFixedStrategy,
    private readonly swissTournamentStrategy: SwissTournamentStrategy,
  ) {
    this.registerStrategies();
  }

  private registerStrategies(): void {
    this.strategies.set(TournamentType.SINGLE_ELIMINATION, this.singleEliminationStrategy);
    this.strategies.set(TournamentType.SWISS, this.swissTournamentStrategy);
  }

  getStrategy(type: TournamentType): TournamentStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Tournament type ${type} is not supported`);
    }
    return strategy;
  }

  getAllStrategies(): TournamentStrategy[] {
    return Array.from(this.strategies.values());
  }

  getSupportedTypes(): TournamentType[] {
    return Array.from(this.strategies.keys());
  }
}