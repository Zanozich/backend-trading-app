import { Repository, Between } from 'typeorm';
import { SymbolEntity } from '../../entities/symbol.entity';
import { TimeframeEntity } from '../../entities/timeframe.entity';
import { CandleEntity } from '../../entities/candle.entity';
import { Candle } from '../types';

export async function getCandlesFromDb(
  symbolName: string,
  timeframeName: string,
  fromTimestamp: number, // ms
  toTimestamp: number, // ms
  deps: {
    candleRepo: Repository<CandleEntity>;
    symbolRepo: Repository<SymbolEntity>;
    timeframeRepo: Repository<TimeframeEntity>;
    // 👇 добавили marketType
    marketType?: 'spot' | 'futures';
  },
): Promise<Candle[]> {
  const { symbolRepo, timeframeRepo, candleRepo, marketType } = deps;

  // ищем символ по (name, type) — если type не передан, ищем только по name (на всякий)
  const symbol = await symbolRepo.findOne({
    where: marketType
      ? { name: symbolName, type: marketType }
      : { name: symbolName },
  });
  if (!symbol) return [];

  const timeframe = await timeframeRepo.findOne({
    where: { name: timeframeName },
  });
  if (!timeframe) return [];

  // ⚠️ фильтруем по FK-колонкам, а не по связям
  const rows = await candleRepo.find({
    where: {
      symbolId: symbol.id,
      timeframeId: timeframe.id,
      timestamp: Between(fromTimestamp, toTimestamp),
    },
    order: { timestamp: 'ASC' },
  });

  return rows.map((c) => ({
    time: Number(c.timestamp),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}
