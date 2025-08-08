import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

export interface Candle {
  time: number; // в секундах (UNIX timestamp)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable()
export class CandlesService {
  async getCandles(): Promise<Candle[]> {
    const filePath = path.join(__dirname, '../../data/Binance_BTCUSDT_1h.csv');
    const file = fs.readFileSync(filePath, 'utf8');

    const records = parse(file, {
      skip_empty_lines: true,
    });

    const candles: Candle[] = records.map((row) => {
      const [timestamp, , , open, high, low, close, volume] = row;

      return {
        time: Math.floor(Number(timestamp) / 1000),
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume),
      };
    });

    return candles.reverse(); // CryptoDataDownload даёт от новых к старым
  }
}
