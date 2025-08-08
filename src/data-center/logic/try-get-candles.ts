import { Candle } from '../../data-center/types';
import { getCandlesFromDb } from './get-candles-from-db';
import { fetchAndSaveCandlesFromBinance } from './fetch-and-save-candles-from-binance';
import { MarketType } from '../../providers/binance/binance';

export async function tryGetCandlesFromDbOrFetchFromBinance(
  symbol: string,
  timeframe: string,
  fromTimestamp: number,
  toTimestamp: number,
  marketType: MarketType, // <--- добавлено
  deps: {
    candleRepo: any;
    symbolRepo: any;
    timeframeRepo: any;
    binance: any;
  },
): Promise<Candle[]> {
  const dbCandles = await getCandlesFromDb(
    symbol,
    timeframe,
    fromTimestamp,
    toTimestamp,
    deps,
  );

  if (dbCandles.length > 0) {
    return dbCandles;
  }

  // fetch → save → return
  const freshCandles = await fetchAndSaveCandlesFromBinance(
    symbol,
    timeframe,
    fromTimestamp,
    toTimestamp,
    marketType, // <--- передаём сюда
    deps,
  );

  return freshCandles;
}
