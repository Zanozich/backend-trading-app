import { Candle } from '../types';
import { validateCandle } from '../validate-candle';

/**
 * Принимает строку из CSV, возвращает Candle или null, если строка некорректна.
 */
export function parseCsvCandleLine(line: string): Candle | null {
  if (!line.trim()) return null;

  const parts = line.split(',');
  const numericParts = parts.map((p, i) =>
    i === 1 || i === 2 ? p : Number(p),
  );

  return validateCandle(numericParts as any); // TODO: уточнить тип, если знаем
}
