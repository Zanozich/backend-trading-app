export type MarketType = 'spot' | 'futures';
export type ExchangeCode = 'binance' | 'bybit' | 'okx';

export interface Candle {
  time: number; // timestamp in milliseconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
