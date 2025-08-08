import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Candle } from '../data-center/types';
import { parseCsvCandleLine } from '../data-center/parsers/parseCsvCandleLine';

/**
 * Загружает свечи из CSV-файла и возвращает массив Candle.
 * Используется как источник данных, но ничего не знает про БД.
 */
export async function loadCandlesFromCsv(filePath: string): Promise<Candle[]> {
  const candles: Candle[] = [];

  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const candle = parseCsvCandleLine(line);
    if (candle) candles.push(candle);
  }

  console.log(`📄 Loaded ${candles.length} candles from CSV`);
  return candles;
}
