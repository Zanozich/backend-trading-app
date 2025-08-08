import { Candle } from '../interfaces/candle.interface';
import { intervalToMs } from './interval-to-ms';

export interface Gap {
  symbol: string;
  interval: string;
  from: number;
  to: number;
}

/**
 * Валидирует массив свечей на непрерывность по времени.
 * Возвращает список пробелов, которые можно дозапросить.
 */
export function findMissingCandleGaps(
  candles: Candle[],
  symbol: string,
  interval: string,
): Gap[] {
  const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
  const ms = intervalToMs(interval);

  const gaps: Gap[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const expected = sorted[i - 1].timestamp + ms;
    const actual = sorted[i].timestamp;

    if (actual > expected) {
      gaps.push({
        symbol,
        interval,
        from: expected,
        to: actual - ms,
      });
    }
  }

  return gaps;
}
