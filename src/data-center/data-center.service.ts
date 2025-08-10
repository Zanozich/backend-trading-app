import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CandleEntity } from '../entities/candle.entity';
import { SymbolEntity } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';

import { ExchangeCode, MarketType } from 'src/domain/market.types';
// Юзкейс-оркестратор: читает БД → дотягивает → сохраняет → перечитывает
import { tryGetCandlesFromDbOrFetch } from './logic/try-get-candles';
// Read-only чтение диапазона из БД (без автофетча)
import { getCandlesFromDb as getCandlesFromDbLogic } from './logic/get-candles-from-db';

// Провайдеры бинанс, байбит и т.д.
import { MarketDataRegistry } from 'src/providers/market-data.registry';

@Injectable()
export class DataCenterService {
  constructor(
    @InjectRepository(SymbolEntity)
    private readonly symbolRepo: Repository<SymbolEntity>,

    @InjectRepository(TimeframeEntity)
    private readonly timeframeRepo: Repository<TimeframeEntity>,

    @InjectRepository(CandleEntity)
    private readonly candleRepo: Repository<CandleEntity>,

    private readonly registry: MarketDataRegistry,
  ) {}

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
  async tryGetCandlesFromDbOrFetch(args: {
    symbolName: string;
    timeframeName: string;
    marketType: MarketType;
    exchange?: ExchangeCode; // default 'binance' применяется в оркестраторе
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
    includePartialLatest?: boolean;
  }) {
    const provider = this.registry.get(args.exchange ?? 'binance');

    return tryGetCandlesFromDbOrFetch({
      symbolRepo: this.symbolRepo,
      timeframeRepo: this.timeframeRepo,
      candleRepo: this.candleRepo,
      marketName: provider,
      ...args,
    });
  }

  /**
   * Read-only: просто прочитать свечи из БД по диапазону (без автофетча).
   * Удобно для внутренних задач, когда знаем, что данные уже есть.
   */
  async getCandlesFromDb(args: {
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
    } = args;

    return getCandlesFromDbLogic(
      symbolName,
      timeframeName,
      fromTimestamp,
      toTimestamp,
      {
        candleRepo: this.candleRepo,
        symbolRepo: this.symbolRepo,
        timeframeRepo: this.timeframeRepo,
        marketType,
        exchange,
      },
    );
  }
}
