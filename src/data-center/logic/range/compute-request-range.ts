import { getIntervalMs } from '../../utils/interval-to-ms';
import { MAX_CANDLES_PER_REQUEST } from '../../../config/limits';

export interface ComputeRangeArgs {
  timeframeName: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  now?: number; // для тестов можно прокидывать «текущее время»
  includePartialLatest?: boolean; // по умолчанию НЕ включаем незакрытый бар
}

export interface ComputedRange {
  fromAligned: number; // включительно
  toAligned: number; // включительно
  step: number; // длительность бара, мс
  limitFinal: number; // итоговый лимит после кэпов
}

/**
 * Возвращает корректное окно запроса «ровно limit баров», выровненное к границам свечей.
 * Не лезет в будущее, гарантирует минимум 1 бар.
 */
export function computeRequestRange(args: ComputeRangeArgs): ComputedRange {
  const {
    timeframeName,
    fromTimestamp,
    toTimestamp,
    limit,
    now = Date.now(),
    includePartialLatest = false,
  } = args;

  const step = getIntervalMs(timeframeName);

  // 1) нормализуем лимит
  let limitFinal = Number.isFinite(limit as number)
    ? Number(limit)
    : MAX_CANDLES_PER_REQUEST;
  if (limitFinal < 1) limitFinal = 1;
  if (limitFinal > MAX_CANDLES_PER_REQUEST)
    limitFinal = MAX_CANDLES_PER_REQUEST;

  // 2) верхняя граница-кандидат — не в будущее
  let TO = typeof toTimestamp === 'number' ? toTimestamp : now;
  if (TO > now) TO = now;

  // Выбираем toAligned: по умолчанию обрезаем до последнего ЗАКРЫТОГО бара
  const lastClosed = Math.floor((now - 1) / step) * step;
  const toCandidate = Math.floor(TO / step) * step;
  const toAligned = includePartialLatest
    ? toCandidate
    : Math.min(toCandidate, lastClosed);

  // 3) нижняя граница — окно на (limit-1) шагов, чтобы получить ровно limit баров
  let FROM =
    typeof fromTimestamp === 'number'
      ? fromTimestamp
      : toAligned - step * (limitFinal - 1);
  if (FROM < 0) FROM = 0;

  // 4) выравниваем к сетке свечей
  let fromAligned = Math.floor(FROM / step) * step;

  // 5) ужимаем, если диапазон шире, чем limit баров (инклюзивно это step*(limit-1))
  const maxSpan = step * (limitFinal - 1);
  if (toAligned - fromAligned > maxSpan) {
    fromAligned = toAligned - maxSpan;
  }

  // 6) гарантируем хотя бы 1 бар
  if (fromAligned >= toAligned) {
    fromAligned = toAligned - step;
  }

  return { fromAligned, toAligned, step, limitFinal };
}
