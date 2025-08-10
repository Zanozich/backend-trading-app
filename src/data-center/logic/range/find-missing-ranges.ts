/**
 * Ищем «дыры» в выровненном интервале [from..to], step — длительность бара в мс.
 * Возвращаем массив полуинклюзивных диапазонов {start..end}, где end включительно.
 */
export function findMissingRanges(
  candles: { time: number }[],
  from: number,
  to: number,
  stepMs: number,
): Array<{ start: number; end: number }> {
  const res: Array<{ start: number; end: number }> = [];
  if (from >= to) return res;

  const existing = candles
    .map((c) => Math.floor(c.time / stepMs) * stepMs)
    .filter((t) => t >= from && t <= to)
    .sort((a, b) => a - b);

  let cursor = Math.floor(from / stepMs) * stepMs;

  for (const t of existing) {
    if (t > cursor) {
      res.push({ start: cursor, end: t - 1 }); // end делаем инклюзивным
    }
    cursor = t + stepMs;
  }
  if (cursor <= to) {
    res.push({ start: cursor, end: to });
  }
  return res;
}
