import { Injectable } from '@nestjs/common';

import { CandlesRepository } from '../infrastructure/persistence/repositories/candles.repository';
import { SymbolsRepository } from '../infrastructure/persistence/repositories/symbols.repository';
import { TimeframesRepository } from '../infrastructure/persistence/repositories/timeframes.repository';

import { ExchangeCode, MarketType } from 'src/data-center/domain/market.types';
// Юзкейс-оркестратор: читает БД → дотягивает → сохраняет → перечитывает
import { getCandlesFromDbOrFetch } from './get-candles/get-candles-orchestrator';

// Провайдеры бинанс, байбит и т.д.
import { MarketDataRegistry } from '../infrastructure/registry/market-data.registry';

import { LoggingService } from 'src/shared/logging/logging.service';

@Injectable()
export class DataCenterService {
  constructor(
    private readonly symbolsRepo: SymbolsRepository,

    private readonly timeframesRepo: TimeframesRepository,

    private readonly candlesRepo: CandlesRepository,

    private readonly registry: MarketDataRegistry,

    private readonly logger: LoggingService,
  ) {
    this.logger.setContext('DataCenterService');
  }

  /**
   * Главная точка входа (Application Service):
   * 1) нормализуем окно в оркестраторе
   * 2) читаем БД
   * 3) дотягиваем недостающее из провайдера (с ретраями)
   * 4) сохраняем в БД
   * 5) перечитываем и обрезаем по limit
   *
   * Все timestamps — миллисекунды (UTC).
   */
  async getCandlesData(params: {
    symbolName: string;
    timeframeName: string;
    marketType: MarketType;
    exchange?: ExchangeCode; // default 'binance' применяется в оркестраторе
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
    includePartialLatest?: boolean;
  }) {
    const context = {
      candlesRepo: this.candlesRepo,
      symbolsRepo: this.symbolsRepo,
      timeframesRepo: this.timeframesRepo,
      registry: this.registry,
      logger: this.logger,
    };

    return getCandlesFromDbOrFetch(context, params);
  }

  /**
   * Read-only: просто прочитать свечи из БД по диапазону (без автофетча).
   * Удобно для внутренних задач, когда знаем, что данные уже есть.
   */
  async getCandlesFromDb(params: {
    symbolName: string;
    timeframeName: string;
    marketType: MarketType;
    exchange?: ExchangeCode; // default 'binance'
    fromTimestamp: number; // уже нормализованные ms
    toTimestamp: number; // уже нормализованные ms
  }) {
    const {
      symbolName,
      timeframeName,
      marketType,
      exchange = 'binance',
      fromTimestamp,
      toTimestamp,
    } = params;

    return this.candlesRepo.findRangeByNames(
      symbolName,
      timeframeName,
      fromTimestamp,
      toTimestamp,
      { exchange, marketType },
    );
  }
}
