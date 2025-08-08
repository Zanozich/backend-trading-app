import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Candle } from '../data-center/types';
import { validateCandle } from '../data-center/validate-candle';

@Injectable()
export class CandlesService {
  private readonly filePath = path.join(
    __dirname,
    '..',
    '..',
    'data',
    'Binance_BTCUSDT_1h.csv',
  );

  async getCandles(): Promise<Candle[]> {
    const fileStream = fs.createReadStream(this.filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const candles: Candle[] = [];

    for await (const line of rl) {
      if (!line.trim()) continue;

      const parts = line.split(',');
      const numericParts = parts.map((p, i) =>
        i === 1 || i === 2 ? p : Number(p),
      );

      const validated = validateCandle(numericParts as any);
      if (validated) {
        candles.push(validated);
      }
    }

    // Сортировка по времени (на всякий случай)
    candles.sort((a, b) => a.time - b.time);

    return candles;
  }
}
