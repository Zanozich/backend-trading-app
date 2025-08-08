import * as fs from 'fs';
import * as readline from 'readline';
import { validateCandle } from '../validate-candle';
import { Candle } from '../types';

/**
 * Читает CSV-файл построчно, валидирует каждую свечу и возвращает массив Candle.
 */
export async function parseCandlesFromCsv(filePath: string): Promise<Candle[]> {
  const fileStream = fs.createReadStream(filePath);
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
    if (validated) candles.push(validated);
  }

  // Сортируем по времени для корректности
  return candles.sort((a, b) => a.time - b.time);
}
