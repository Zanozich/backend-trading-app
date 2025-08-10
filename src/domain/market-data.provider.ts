import { Candle, MarketType, ExchangeCode } from 'src/domain/market.types';

export interface MarketDataProvider {
  readonly exchange: ExchangeCode; // например, 'binance'
  fetchCandles(
    type: MarketType,
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]>;
}
