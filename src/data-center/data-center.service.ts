import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandleEntity } from '../entities/candle.entity';
import { SymbolEntity } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';
import { Candle } from './types';
import { getOrCreateSymbol } from './helpers/get-or-create-symbol';
import { getOrCreateTimeframe } from './helpers/get-or-create-timeframe';
import { saveCandlesToDb } from './helpers/save-candles-to-db';

@Injectable()
export class DataCenterService {
  constructor(
    @InjectRepository(SymbolEntity)
    private readonly symbolRepo: Repository<SymbolEntity>,
    @InjectRepository(TimeframeEntity)
    private readonly timeframeRepo: Repository<TimeframeEntity>,
    @InjectRepository(CandleEntity)
    private readonly candleRepo: Repository<CandleEntity>,
  ) {}

  /**
   * Импортирует свечи в базу данных, не зная их источник.
   * Источник должен передать symbol, timeframe и свечи.
   */
  async importCandles(
    candles: Candle[],
    symbolName: string,
    timeframeName: string,
  ): Promise<void> {
    const symbol = await getOrCreateSymbol(this.symbolRepo, symbolName);
    const timeframe = await getOrCreateTimeframe(
      this.timeframeRepo,
      timeframeName,
    );
    await saveCandlesToDb(candles, this.candleRepo, symbol, timeframe);
  }

  async getCandlesFromDb(
    symbolName: string,
    timeframeName: string,
  ): Promise<Candle[]> {
    const symbol = await this.symbolRepo.findOne({
      where: { name: symbolName },
    });
    const timeframe = await this.timeframeRepo.findOne({
      where: { name: timeframeName },
    });

    if (!symbol || !timeframe) return [];

    const candles = await this.candleRepo.find({
      where: { symbol: { id: symbol.id }, timeframe: { id: timeframe.id } },
      order: { timestamp: 'ASC' },
    });

    return candles.map((c) => ({
      time: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
  }
}
