import { Candle } from 'src/data-center/domain/market.types';
import { CandlesRepository } from 'src/data-center/infrastructure/persistence/repositories/candles.repository';
import { LoggingService } from 'src/shared/logging/logging.service';

/**
 * Перечитывает итоговое окно из БД (только закрытые бары),
 * опционально доклеивает частичный бар (НЕ персистит),
 * и обрезает по limit.
 *
 * Инварианты:
 *  - БД содержит ТОЛЬКО закрытые бары;
 *  - partialCandidate (если есть) — это НЕперсистентный «живой» бар из провайдера;
 *  - дублей по time быть не должно.
 */
export async function assembleResponse(params: {
  symbolId: number;
  timeframeId: number;
  fromAligned: number; // левая граница (включительно)
  toAligned: number; // правая граница (включительно)
  includePartialLatest: boolean;
  limitFinal?: number;
  candlesRepo: CandlesRepository;
  partialCandidate?: Candle;
  logger: LoggingService;
}): Promise<Candle[]> {
  const {
    symbolId,
    timeframeId,
    fromAligned,
    toAligned,
    includePartialLatest,
    limitFinal,
    candlesRepo,
    partialCandidate,
    logger,
  } = params;

  logger.setContext('AssembleResponse');

  // 1) Перечитать БД по ID — быстрее, чем по именам
  let rows = await candlesRepo.findRangeByIds(
    Number(symbolId),
    Number(timeframeId),
    fromAligned,
    toAligned,
  );
  logger.debug('DB after-save', { len: rows.length });

  // 2) Доклеить частичный бар в ОТВЕТ (НЕ в БД), если он попадает в окно
  if (includePartialLatest && partialCandidate) {
    const inWindow =
      partialCandidate.time >= fromAligned &&
      partialCandidate.time <= toAligned;

    if (inWindow) {
      const last = rows[rows.length - 1];
      const isDuplicate = !!last && last.time === partialCandidate.time;

      if (!isDuplicate) {
        rows = [...rows, partialCandidate];
      }
    }
  }

  // 3) Правый срез по лимиту (оставляем самые свежие)
  if (limitFinal && rows.length > limitFinal) {
    rows = rows.slice(-limitFinal);
  }

  return rows;
}
