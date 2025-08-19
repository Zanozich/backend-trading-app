import { ExchangeCode, MarketType } from 'src/data-center/domain/market.types';
import { LoggingService } from 'src/shared/logging/logging.service';
import { CandlesRepository } from '../../infrastructure/persistence/repositories/candles.repository';
import { SymbolsRepository } from '../../infrastructure/persistence/repositories/symbols.repository';
import { TimeframesRepository } from '../../infrastructure/persistence/repositories/timeframes.repository';
import { MarketDataRegistry } from '../../infrastructure/registry/market-data.registry';

export interface GetCandlesParams {
  symbolName: string;
  timeframeName: string;
  marketType: MarketType;
  exchange?: ExchangeCode;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  includePartialLatest?: boolean;
}

export interface GetCandlesContext {
  candlesRepo: CandlesRepository;
  symbolsRepo: SymbolsRepository;
  timeframesRepo: TimeframesRepository;
  registry: MarketDataRegistry;
  logger: LoggingService;
}
