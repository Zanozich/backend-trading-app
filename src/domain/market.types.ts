// типы (compile-time)
export type MarketType = 'spot' | 'futures';
export type ExchangeCode = 'binance' | 'bybit' | 'okx';

// константы (runtime) — удобно для валидации через class-validator (@IsIn)
export const MARKET_TYPES = ['spot', 'futures'] as const;
export const EXCHANGES = ['binance', 'bybit', 'okx'] as const;

export interface Candle {
  time: number; // timestamp in milliseconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
