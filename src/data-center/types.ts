export type RawCandle = [
  number, // timestamp (ms)
  string, // date (можно игнорировать)
  string, // symbol
  number, // open
  number, // high
  number, // low
  number, // close
  number, // volume
  number, // quote volume
  number, // trades
];

export interface Candle {
  time: number; // timestamp in seconds (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
