import { Repository, Between } from 'typeorm';
import { SymbolEntity } from '../../entities/symbol.entity';
import { TimeframeEntity } from '../../entities/timeframe.entity';
import { CandleEntity } from '../../entities/candle.entity';
import { Candle } from 'src/domain/market.types';
import { MarketType, ExchangeCode } from '../../domain/market.types';

export async function getCandlesFromDb(
  symbolName: string,
  timeframeName: string,
  fromTimestamp: number, // ms
  toTimestamp: number, // ms
  deps: {
    candleRepo: Repository<CandleEntity>;
    symbolRepo: Repository<SymbolEntity>;
    timeframeRepo: Repository<TimeframeEntity>;
    marketType: MarketType;
    exchange: ExchangeCode;
  },
): Promise<Candle[]> {
  const { symbolRepo, timeframeRepo, candleRepo, marketType, exchange } = deps;

  // Ищем символ строго по (name, type, exchange)
  const symbol = await symbolRepo.findOne({
    where: { name: symbolName, type: marketType, exchange },
  });
  if (!symbol) return [];

  const timeframe = await timeframeRepo.findOne({
    where: { name: timeframeName },
  });
  if (!timeframe) return [];

  // Фильтруем по FK, используем диапазон по timestamp
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
