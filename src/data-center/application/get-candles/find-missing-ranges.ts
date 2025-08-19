/**
 * Ищем «дыры» в выровненном интервале [rangeStartMs..rangeEndMs] для рядов со свечами.
 * Важно: диапазон полуинклюзивный по слотам, но end в ответе — включительно (удобно для REST).
 *
 * Правила:
 * - Каждый бар занимает слот длительностью barStepMs и начинается в момент, кратный barStepMs.
 * - Входные свечи могут иметь произвольный time — мы нормализуем его к началу слота.
 * - Возвращаем массив промежутков без баров: { start, end }, где end включительно.
 */
export function findMissingRanges(
  bars: { time: number }[],
  rangeStartMs: number,
  rangeEndMs: number,
  barStepMs: number,
): Array<{ start: number; end: number }> {
  // 0) Базовая проверка: пустой или перевёрнутый диапазон — «дыр» нет
  const gaps: Array<{ start: number; end: number }> = [];
  if (rangeStartMs >= rangeEndMs) return gaps;

  // 1) Нормализуем вход:
  //    1.1) Выравниваем старт к сетке баров (на всякий случай; обычно уже выровнено)
  const alignedStart = Math.floor(rangeStartMs / barStepMs) * barStepMs;

  //    1.2) Приводим times свечей к началу слотов, отбрасываем вне диапазона, убираем дубликаты и сортируем
  //         (дубликаты возможны из-за upsert'ов/слияний разных чанков).
  const occupiedSlots = Array.from(
    new Set(
      bars
        .map((b) => Math.floor(b.time / barStepMs) * barStepMs)
        .filter((t) => t >= alignedStart && t <= rangeEndMs),
    ),
  ).sort((a, b) => a - b);

  // 2) Идём слева направо «курсором» по слотам.
  //    Если следующий занятый слот > cursor, значит между cursor и (slotStart-1) есть «дыра».
  let cursor = alignedStart;

  for (const slotStart of occupiedSlots) {
    // 2.1) Если обнаружили разрыв — фиксируем «дыру» (end делаем включительным)
    if (slotStart > cursor) {
      gaps.push({ start: cursor, end: slotStart - 1 });
    }
    // 2.2) Сдвигаем курсор на следующий ожидаемый слот после занятого
    cursor = slotStart + barStepMs;
  }

  // 3) Хвост: если курсор не дошёл до конца диапазона — добиваем последнюю «дыру»
  if (cursor <= rangeEndMs) {
    gaps.push({ start: cursor, end: rangeEndMs });
  }

  return gaps;
}
