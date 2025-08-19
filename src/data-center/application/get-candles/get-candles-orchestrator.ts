// хелперы по расчету+поиск пропусков в информации
import { computeRequestRange } from './compute-request-range';
import { findMissingRanges } from './find-missing-ranges';
import { fetchMissingAndPersistClosed } from './fetch-missing-candles';
import { assembleResponse } from './assemble-response';

// Политики приложения (лимиты/ретраи)
import {
  MAX_GAP_FETCHES,
  DEFAULT_INCLUDE_PARTIAL_LATEST,
} from '../config/limits';

// Доменные типы
import { MarketType, ExchangeCode } from 'src/data-center/domain/market.types';
import { MarketDataProvider } from 'src/data-center/domain/ports';
import { GetCandlesContext, GetCandlesParams } from './types';
import { LoggingService } from 'src/shared/logging/logging.service';

/**
 * Универсально получаем серверное время биржи через провайдера.
 * Fallback — локальное время, но обязательно логируем WARN.
 */
async function getServerTimeMsSafe(
  provider: MarketDataProvider,
  marketType: MarketType,
  logger: LoggingService,
): Promise<number> {
  const anyProv = provider as any;
  const has = typeof anyProv?.getServerTimeMs === 'function';

  if (has) {
    try {
      const t = await anyProv.getServerTimeMs(marketType);
      if (Number.isFinite(t)) return t as number;
    } catch (e) {
      logger.warn('[Orchestrator] getServerTimeMs failed', {
        error: (e as Error)?.message ?? String(e),
      });
    }
  }

  const local = Date.now();
  logger.warn('[Orchestrator] using local time as fallback', {
    iso: new Date(local).toISOString(),
  });
  return local;
}

/**
 * Юзкейс «получить свечи (read-through cache)»
 *
 * Границы ответственности:
 *  - этот файл только "склеивает главы" и логирует крупные шаги;
 *  - расчёты окна/поиск дыр/дотяжка/пересборка ответа — в отдельных модулях.
 *
 * Инварианты:
 *  - БД хранит только закрытые бары (никаких partial);
 *  - Правило закрытия: openTime + step <= serverTimeMs (или биржевой confirm/isFinal);
 *  - partial, если нужен — доклеивается только в ОТВЕТ.
 */
export async function getCandlesFromDbOrFetch(
  context: GetCandlesContext,
  params: GetCandlesParams,
) {
  const { candlesRepo, symbolsRepo, timeframesRepo, registry, logger } =
    context;

  logger.setContext('Orchestrator');

  const {
    symbolName,
    timeframeName,
    marketType,
    exchange = 'binance', // ADDED default
    fromTimestamp,
    toTimestamp,
    limit,
    includePartialLatest = DEFAULT_INCLUDE_PARTIAL_LATEST,
  } = params;

  // 0) резолвим провайдера
  const marketProvider = registry.get(exchange);

  // 1) фиксируем серверное время биржи (универсально для всех провайдеров)
  const serverTimeMs = await getServerTimeMsSafe(
    marketProvider,
    marketType,
    logger,
  );

  // 2) считаем выровненное окно с учётом includePartialLatest и serverTimeMs
  const { fromAligned, toAligned, step, limitFinal } = computeRequestRange({
    timeframeName,
    fromTimestamp,
    toTimestamp,
    limit,
    includePartialLatest,
    serverTimeMs,
  });

  logger.debug('[Orchestrator] range computed', {
    fromAligned,
    toAligned,
    step,
    limitFinal,
    includePartialLatest,
  });

  // 3) первичное чтение из БД по ИМЕНАМ (дешёво и без создания сущностей)
  const initial = await candlesRepo.findRangeByNames(
    symbolName,
    timeframeName,
    fromAligned,
    toAligned,
    { exchange, marketType },
  );

  logger.debug('[Orchestrator] DB initial', { len: initial.length });

  // 4) «дыры» в ряду (с учётом выровнённого окна)
  let gaps = findMissingRanges(initial, fromAligned, toAligned, step);

  if (gaps.length === 0) {
    // 6) Сборка финального ответа (без fetch'а): перечитать БД, доклеить partial? — не из чего, просто слайс по лимиту
    return assembleResponse({
      // отдаём initial со слайсом
      // Чтобы не усложнять, здесь оставим fast-path:
      symbolId: 0, // ADDED placeholder (ниже fallback)
      timeframeId: 0, // ADDED placeholder (ниже fallback)
      fromAligned,
      toAligned,
      includePartialLatest,
      limitFinal,
      candlesRepo, // не используется в этом fast-path
      partialCandidate: undefined,
      logger,
    }).then(() => {
      // ADDED: fast-path — если «дыр» не было, возвращаем initial с лимитом
      return limitFinal && initial.length > limitFinal
        ? initial.slice(-limitFinal)
        : initial;
    });
  }

  // 4.1) ограничим число «окон» для fetch (защита от сверхдырявых диапазонов)
  if (MAX_GAP_FETCHES && gaps.length > MAX_GAP_FETCHES) {
    gaps = gaps.slice(-MAX_GAP_FETCHES);
  }

  // 5) получаем/создаём справочники (теперь уже понадобятся ID для записи)
  const symbol = await symbolsRepo.getOrCreate({
    exchange,
    marketType,
    name: symbolName,
  });
  const timeframe = await timeframesRepo.getOrCreate({ name: timeframeName });

  // 6) Дотягиваем «дыры» из провайдера:
  //    - сохраняем только ЗАКРЫТЫЕ бары,
  //    - собираем partial-кандидата (самый правый незакрытый)
  const { persistedClosedCount, partialCandidate } =
    await fetchMissingAndPersistClosed({
      gaps,
      marketProvider,
      marketType,
      symbolName,
      timeframeName,
      step,
      serverTimeMs,
      candlesRepo,
      symbolId: symbol.id,
      timeframeId: timeframe.id,
      logger,
    });

  logger.debug('[Orchestrator] fetched closed', {
    persistedClosedCount,
  });

  // 7) Сборка финального ответа:
  //    - перечитать БД по ID,
  //    - при необходимости доклеить partial,
  //    - обрезать по limit
  const result = await assembleResponse({
    symbolId: Number(symbol.id),
    timeframeId: Number(timeframe.id),
    fromAligned,
    toAligned,
    includePartialLatest,
    limitFinal,
    candlesRepo,
    partialCandidate,
    logger,
  });

  return result;
}
