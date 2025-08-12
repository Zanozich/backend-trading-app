import { Repository } from 'typeorm';
import { MarketDataProvider } from 'src/data-center/domain/market-data.provider';
import { Candle, MarketType } from 'src/data-center/domain/market.types';
import { CandleEntity } from '../../infrastructure/persistence/entities/candle.entity';
import { SymbolEntity } from '../../infrastructure/persistence/entities/symbol.entity';
import { TimeframeEntity } from '../../infrastructure/persistence/entities/timeframe.entity';

import {
  HTTP_MAX_RETRIES_MARKETDATA,
  HTTP_RETRY_BASE_DELAY_MS,
  HTTP_RETRY_FACTOR,
  HTTP_RETRY_MAX_DELAY_MS,
  HTTP_RETRY_JITTER,
} from '../config/limits';
import { retry } from '../retry';

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
  marketName: MarketDataProvider;
  marketType: MarketType;
  symbolName: string;
  timeframeName: string;
  step: number; // длительность бара (ms)
  serverTimeMs: number; // "истинное" время — от биржи

  // persistence
  candleRepo: Repository<CandleEntity>;
  symbol: SymbolEntity;
  timeframe: TimeframeEntity;
}): Promise<{ persistedClosedCount: number; partialCandidate?: Candle }> {
  const {
    gaps,
    marketName,
    marketType,
    symbolName,
    timeframeName,
    step,
    serverTimeMs,
    candleRepo,
    symbol,
    timeframe,
  } = params;

  let persistedClosedCount = 0;
  let partialCandidate: Candle | undefined;

  for (const { start, end } of gaps) {
    // 1) Дотягиваем окно с ретраями — здесь только сетевой I/O, без бизнес-логики
    const klines = await retry(
      () =>
        marketName.fetchCandles(
          marketType,
          symbolName.toUpperCase(), // унифицируем регистр символа для бирж
          timeframeName,
          start,
          end,
        ),
      {
        retries: HTTP_MAX_RETRIES_MARKETDATA, // политика ретраев
        baseDelayMs: HTTP_RETRY_BASE_DELAY_MS,
        factor: HTTP_RETRY_FACTOR,
        maxDelayMs: HTTP_RETRY_MAX_DELAY_MS,
        jitter: HTTP_RETRY_JITTER,
      },
      (attempt, err, delay) => {
        console.warn(
          `[Orchestrator] fetch retry #${attempt} in ${delay}ms for ${symbolName} ${timeframeName} [${start}..${end}]:`,
          (err as Error)?.message ?? err,
        );
      },
    );

    // 2) Закрытые бары — те, у которых openTime + step <= serverTimeMs
    //    Их можно персистить — они не изменятся.
    const closedOnly = klines.filter((c) => c.time + step <= serverTimeMs);

    if (closedOnly.length) {
      await saveClosedBatch(closedOnly, candleRepo, symbol, timeframe);
      persistedClosedCount += closedOnly.length;
    }

    // 3) Частичные бары — НЕ в БД.
    //    Держим только самый правый (по времени), чтобы потом вернуть его в ответ (если нужен).
    for (const c of klines) {
      const isClosed = c.time + step <= serverTimeMs;
      if (!isClosed && (!partialCandidate || c.time > partialCandidate.time)) {
        partialCandidate = c;
      }
    }
  }

  return { persistedClosedCount, partialCandidate };
}

/**
 * Локальная обёртка для сохранения закрытых баров.
 * Здесь намеренно нет knowledge о «дырах» — это чистый upsert батчем.
 */
async function saveClosedBatch(
  closed: Candle[],
  candleRepo: Repository<CandleEntity>,
  symbol: SymbolEntity,
  timeframe: TimeframeEntity,
): Promise<void> {
  if (!closed.length) return;
  // ADDED: dynamic import, чтобы избежать жёсткой связки и возможных циклов
  const { saveCandlesToDb } = await import('../../helpers/save-candles-to-db'); // ADDED
  await saveCandlesToDb(closed, candleRepo, symbol, timeframe);
}
