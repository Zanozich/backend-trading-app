// Domain ports for market data.
// - MarketDataHistoryPort: fetchCandles(), getServerTimeMs(), syncSymbols?()
// - MarketDataLivePort:   subscribeCandles(params): AsyncIterable<CandleEvent>
// - MarketDataProvider = HistoryPort & (partial) LivePort

import {
  Candle,
  MarketType,
  ExchangeCode,
} from 'src/data-center/domain/market.types';

export interface MarketDataProvider {
  readonly exchange: ExchangeCode; // например, 'binance'
  fetchCandles(
    type: MarketType,
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]>;

  // унифицированный метод получения времени сервера биржи
  getServerTimeMs(type: MarketType): Promise<number>;
}
