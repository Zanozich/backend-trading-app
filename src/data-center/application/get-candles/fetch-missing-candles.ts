import { MarketDataProvider } from 'src/data-center/domain/ports';
import { Candle, MarketType } from 'src/data-center/domain/market.types';

import {
  HTTP_MAX_RETRIES_MARKETDATA,
  HTTP_RETRY_BASE_DELAY_MS,
  HTTP_RETRY_FACTOR,
  HTTP_RETRY_MAX_DELAY_MS,
  HTTP_RETRY_JITTER,
} from '../config/limits';
import { retry } from '../retry';
import { CandlesRepository } from '../../infrastructure/persistence/repositories/candles.repository';
import { LoggingService } from 'src/shared/logging/logging.service';

type Gap = { start: number; end: number };

/**
 * Дотягивает недостающие интервалы («дыры») из провайдера.
 * ВАЖНО:
 *  - в БД сохраняем ТОЛЬКО ЗАКРЫТЫЕ бары (по правилу serverTimeMs),
 *  - «частичный» (формирующийся) бар НЕ сохраняем — возвращаем как candidate,
 *  - идемпотентность достигается upsert-логикой saveCandlesToDb.
 *
 * Возвращаем:
 *  - persistedClosedCount — сколько закрытых реально записали в БД,
 *  - partialCandidate — самый правый незакрытый бар, если встретился.
 */
export async function fetchMissingAndPersistClosed(params: {
  gaps: Gap[];
  marketProvider: MarketDataProvider;
  marketType: MarketType;
  symbolName: string;
  timeframeName: string;
  step: number; // длительность бара (ms)
  serverTimeMs: number; // "истинное" время — от биржи

  candlesRepo: CandlesRepository;

  symbolId: number;
  timeframeId: number;

  logger: LoggingService;
}): Promise<{ persistedClosedCount: number; partialCandidate?: Candle }> {
  const {
    gaps,
    marketProvider,
    marketType,
    symbolName,
    timeframeName,
    step,
    serverTimeMs,
    candlesRepo,
    symbolId,
    timeframeId,
    logger,
  } = params;

  let persistedClosedCount = 0;
  let partialCandidate: Candle | undefined;

  for (const { start, end } of gaps) {
    // 1) сетевой fetch с ретраями (без бизнес-логики внутри)
    const klines = await retry(
      () =>
        marketProvider.fetchCandles(
          marketType,
          symbolName.toUpperCase(),
          timeframeName,
          start,
          end,
        ),
      {
        retries: HTTP_MAX_RETRIES_MARKETDATA,
        baseDelayMs: HTTP_RETRY_BASE_DELAY_MS,
        factor: HTTP_RETRY_FACTOR,
        maxDelayMs: HTTP_RETRY_MAX_DELAY_MS,
        jitter: HTTP_RETRY_JITTER,
      },
      (attempt, err, delay) => {
        logger.warn('[fetchMissing] retry', {
          attempt,
          delay,
          symbolName,
          timeframeName,
          start,
          end,
          error: (err as Error)?.message ?? String(err),
        });
      },
    );

    // 2) закрытые бары — в БД
    const closedOnly = klines.filter((c) => c.time + step <= serverTimeMs);
    if (closedOnly.length) {
      await candlesRepo.upsertBatchByIds(closedOnly, symbolId, timeframeId); // ADDED
      persistedClosedCount += closedOnly.length;
    }

    // 3) частичный бар — НЕ в БД, держим только самый правый
    for (const c of klines) {
      const isClosed = c.time + step <= serverTimeMs;
      if (!isClosed && (!partialCandidate || c.time > partialCandidate.time)) {
        partialCandidate = c;
      }
    }
  }

  return { persistedClosedCount, partialCandidate };
}
