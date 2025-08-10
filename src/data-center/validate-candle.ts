import { RawCandle, Candle } from './types';

/**
 * Поддерживаем два формата строк:
 * - 6 колонок: [ts, open, high, low, close, volume]
 * - 8+ колонок: [ts, _, _, open, high, low, close, volume, ...]
 * ts может быть в секундах, миллисекундах или микросекундах.
 */
export function validateCandle(row: RawCandle): Candle | null {
  if (!Array.isArray(row) || row.length < 6) {
    return null;
  }

  let ts: number;
  let open: number;
  let high: number;
  let low: number;
  let close: number;
  let volume: number;

  if (row.length >= 8) {
    // формат с 8+ колонками
    [ts, , , open, high, low, close, volume] = row as number[];
  } else {
    // формат с 6 колонками
    [ts, open, high, low, close, volume] = row as number[];
  }

  // Проверка чисел
  if (
    ![ts, open, high, low, close, volume].every(
      (n) => typeof n === 'number' && Number.isFinite(n),
    )
  ) {
    return null;
  }

  // Нормализация времени
  let tsMs: number;
  if (ts >= 1e15)
    tsMs = Math.floor(ts / 1000); // микросекунды → мс
  else if (ts >= 1e12)
    tsMs = ts; // уже мс
  else if (ts >= 1e9)
    tsMs = ts * 1000; // секунды → мс
  else return null;

  const sec = Math.floor(tsMs / 1000);

  // Диапазон времени (2010-01-01 .. 2035-01-01) — можно подправить при необходимости
  if (sec < 1262304000 || sec > 2051222400) {
    return null;
  }

  // Проверки OHLC
  if (high < Math.max(open, close) || low > Math.min(open, close)) {
    return null;
  }
  if (low > high) {
    return null;
  }

  return { time: sec, open, high, low, close, volume };
}
