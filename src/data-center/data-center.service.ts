import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CandleEntity } from '../entities/candle.entity';
import { SymbolEntity, MarketType } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';

import { Candle } from './types';
import { tryGetCandlesFromDbOrFetch } from './logic/try-get-candles';
import { getOrCreateSymbol } from './helpers/get-or-create-symbol';
import { getOrCreateTimeframe } from './helpers/get-or-create-timeframe';
import { saveCandlesToDb } from './helpers/save-candles-to-db';

import { Binance } from '../providers/binance/binance';
import { getCandlesFromDb as getCandlesFromDbLogic } from './logic/get-candles-from-db';

@Injectable()
export class DataCenterService {
  constructor(
    @InjectRepository(SymbolEntity)
    private readonly symbolRepo: Repository<SymbolEntity>,

    @InjectRepository(TimeframeEntity)
    private readonly timeframeRepo: Repository<TimeframeEntity>,

    @InjectRepository(CandleEntity)
    private readonly candleRepo: Repository<CandleEntity>,

    private readonly binance: Binance,
  ) {}

  /**
   * Главная точка: сначала читаем БД, если пусто/не хватает — тянем с Binance,
   * сохраняем в БД и отдаем результат.
   * Все timestamps — в миллисекундах.
   */
  async tryGetCandlesFromDbOrFetch(args: {
    symbolName: string;
    timeframeName: string;
    marketType: MarketType;
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
  }) {
    return tryGetCandlesFromDbOrFetch({
      symbolRepo: this.symbolRepo,
      timeframeRepo: this.timeframeRepo,
      candleRepo: this.candleRepo,
      binance: this.binance,
      ...args,
    });
  }

  /**
   * Импортирует свечи в базу данных, не зная их источник.
   * Источник должен передать symbol, timeframe и свечи.
   */
  async importCandles(
    candles: Candle[],
    symbolName: string,
    timeframeName: string,
    marketType: MarketType,
  ): Promise<void> {
    console.log(
      `[DataCenter] importCandles start: ${symbolName} ${timeframeName} ${marketType}, candles=${candles.length}`,
    );

    if (!candles?.length) {
      console.log('[DataCenter] no candles to import — skip');
      return;
    }

    const symbol = await getOrCreateSymbol(
      this.symbolRepo,
      symbolName,
      marketType,
    );
    const timeframe = await getOrCreateTimeframe(
      this.timeframeRepo,
      timeframeName,
    );

    await saveCandlesToDb(candles, this.candleRepo, symbol, timeframe);

    console.log('[DataCenter] importCandles done');
  }

  /**
   * Прокси для обратной совместимости.
   * Если даты не переданы — берём "с самого начала" и далеко в будущее.
   * В БД у нас timestamp в СЕКУНДАХ.
   */
  async getCandlesFromDb(
    symbolName: string,
    timeframeName: string,
    fromTimestamp?: number,
    toTimestamp?: number,
  ) {
    const from = fromTimestamp ?? 0; // мс от эпохи
    const to = toTimestamp ?? 4102444800000; // 2100-01-01 В МИЛЛИСЕКУНДАХ

    return getCandlesFromDbLogic(symbolName, timeframeName, from, to, {
      candleRepo: this.candleRepo,
      symbolRepo: this.symbolRepo,
      timeframeRepo: this.timeframeRepo,
    });
  }
}
