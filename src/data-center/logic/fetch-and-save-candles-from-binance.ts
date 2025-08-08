import { Repository } from 'typeorm';
import { SymbolEntity } from '../../entities/symbol.entity';
import { TimeframeEntity } from '../../entities/timeframe.entity';
import { CandleEntity } from '../../entities/candle.entity';
import { Candle } from '../types';
import { getOrCreateSymbol } from '../helpers/get-or-create-symbol';
import { getOrCreateTimeframe } from '../helpers/get-or-create-timeframe';
import { saveCandlesToDb } from '../helpers/save-candles-to-db';
import { Binance, MarketType } from '../../providers/binance/binance';

export async function fetchAndSaveCandlesFromBinance(
  symbolName: string,
  timeframeName: string,
  fromTimestamp: number,
  toTimestamp: number,
  marketType: MarketType, // 'spot' | 'futures'
  deps: {
    candleRepo: Repository<CandleEntity>;
    symbolRepo: Repository<SymbolEntity>;
    timeframeRepo: Repository<TimeframeEntity>;
    binance: Binance;
  },
): Promise<Candle[]> {
  const { candleRepo, symbolRepo, timeframeRepo, binance } = deps;

  // Получаем свечи с Binance
  const candles = await binance.fetchCandles(
    marketType,
    symbolName,
    timeframeName,
    fromTimestamp,
    toTimestamp,
  );

  // Получаем или создаём symbol/timeframe
  const symbol = await getOrCreateSymbol(symbolRepo, symbolName, marketType);
  const timeframe = await getOrCreateTimeframe(timeframeRepo, timeframeName);

  // Сохраняем в БД
  await saveCandlesToDb(candles, candleRepo, symbol, timeframe);

  return candles;
}
