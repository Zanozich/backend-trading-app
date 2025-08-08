import { Repository } from 'typeorm';
import { SymbolEntity } from '../../entities/symbol.entity';
import { TimeframeEntity } from '../../entities/timeframe.entity';
import { CandleEntity } from '../../entities/candle.entity';
import { Candle } from '../types';
import { Between } from 'typeorm';

/**
 * Получает свечи из БД за заданный период.
 */
export async function getCandlesFromDb(
  symbolName: string,
  timeframeName: string,
  fromTimestamp: number,
  toTimestamp: number,
  deps: {
    candleRepo: Repository<CandleEntity>;
    symbolRepo: Repository<SymbolEntity>;
    timeframeRepo: Repository<TimeframeEntity>;
  },
): Promise<Candle[]> {
  const { symbolRepo, timeframeRepo, candleRepo } = deps;

  const symbol = await symbolRepo.findOne({ where: { name: symbolName } });
  const timeframe = await timeframeRepo.findOne({
    where: { name: timeframeName },
  });

  if (!symbol || !timeframe) return [];

  const candles = await candleRepo.find({
    where: {
      symbol: { id: symbol.id },
      timeframe: { id: timeframe.id },
      timestamp: Between(fromTimestamp, toTimestamp),
    },
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
