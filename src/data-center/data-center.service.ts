import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CandleEntity } from '../entities/candle.entity';
import { SymbolEntity, MarketType } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';

import { Candle } from './types';
import { tryGetCandlesFromDbOrFetchFromBinance } from './logic/try-get-candles';
import { getOrCreateSymbol } from './helpers/get-or-create-symbol';
import { getOrCreateTimeframe } from './helpers/get-or-create-timeframe';
import { saveCandlesToDb } from './helpers/save-candles-to-db';

import { Binance } from '../providers/binance/binance';

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
   * Главная точка получения свечей:
   * - пробует получить из БД
   * - если нет — запрашивает у Binance
   * - сохраняет в БД
   * - возвращает итоговый массив свечей
   */
  async getCandles(
    symbol: string,
    timeframe: string,
    from: number,
    to: number,
    marketType: MarketType,
  ): Promise<Candle[]> {
    return await tryGetCandlesFromDbOrFetchFromBinance(
      symbol,
      timeframe,
      from,
      to,
      marketType,
      {
        candleRepo: this.candleRepo,
        symbolRepo: this.symbolRepo,
        timeframeRepo: this.timeframeRepo,
        binance: this.binance,
      },
    );
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
  }
}
