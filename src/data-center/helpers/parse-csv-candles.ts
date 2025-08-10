import * as fs from 'fs';
import * as readline from 'readline';
import { validateCandle } from '../validate-candle';
import { Candle } from '../types';

/**
 * Поддерживаем два формата:
 * A) 6 колонок: timestamp,open,high,low,close,volume
 * B) 10 колонок (как у тебя): Unix,Date,Symbol,Open,High,Low,Close,Volume BTC,Volume USDT,tradecount
 *    — берём Volume BTC как volume.
 */
export async function parseCandlesFromCsv(filePath: string): Promise<Candle[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const candles: Candle[] = [];
  let accepted = 0;
  let rejected = 0;

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;

    // Пропускаем заголовок
    if (/^unix[,;]/i.test(line)) continue;

    const parts = line.split(',');
    if (parts.length < 6) {
      rejected++;
      continue;
    }

    // Определяем раскладку колонок
    // Если в parts[1] не число (обычно там "Date"), считаем формат B (10 колонок)
    const isFormatB = parts.length >= 9 && !Number.isFinite(Number(parts[1]));

    const idx = isFormatB
      ? { ts: 0, open: 3, high: 4, low: 5, close: 6, volume: 7 } // Unix,Date,Symbol,Open,High,Low,Close,VolumeBTC,VolumeUSDT,trades
      : { ts: 0, open: 1, high: 2, low: 3, close: 4, volume: 5 }; // timestamp,open,high,low,close,volume

    const tsRaw = Number(parts[idx.ts]);
    const open = Number(parts[idx.open]);
    const high = Number(parts[idx.high]);
    const low = Number(parts[idx.low]);
    const close = Number(parts[idx.close]);
    const volume = Number(parts[idx.volume]);

    if (
      ![tsRaw, open, high, low, close, volume].every((n) => Number.isFinite(n))
    ) {
      rejected++;
      continue;
    }

    // Валидатор ждёт ms: переводим sec→ms при необходимости
    const tsMs = tsRaw > 1e12 ? tsRaw : tsRaw * 1000;

    const validated = validateCandle([
      tsMs,
      open,
      high,
      low,
      close,
      volume,
    ] as any);
    if (validated) {
      candles.push(validated);
      accepted++;
    } else {
      rejected++;
    }
  }

  candles.sort((a, b) => a.time - b.time);
  console.log(
    `[CSV] accepted=${accepted}, rejected=${rejected}, total=${accepted + rejected}`,
  );
  return candles;
}
