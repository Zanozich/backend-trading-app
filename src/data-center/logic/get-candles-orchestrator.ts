import { Repository } from 'typeorm';

import { CandleEntity } from '../../entities/candle.entity';
import { SymbolEntity } from '../../entities/symbol.entity';
import { TimeframeEntity } from '../../entities/timeframe.entity';

import { getCandlesFromDb } from './get-candles-from-db';
import { getOrCreateSymbol } from '../helpers/get-or-create-symbol';
import { getOrCreateTimeframe } from '../helpers/get-or-create-timeframe';

// хелперы по расчету+поиск пропусков в информации
import { computeRequestRange } from './orchestrator/compute-request-range';
import { findMissingRanges } from './orchestrator/find-missing-ranges';
import { fetchMissingAndPersistClosed } from './orchestrator/fetch-missing-candles';
import { assembleResponse } from './orchestrator/assemble-response';

// Политики приложения (лимиты/ретраи)
import {
  MAX_GAP_FETCHES,
  DEFAULT_INCLUDE_PARTIAL_LATEST,
} from '../../config/limits';

// Доменные типы
import { MarketType, ExchangeCode } from 'src/domain/market.types';
import { MarketDataProvider } from 'src/domain/market-data.provider';

/**
 * Универсально получаем серверное время биржи.
 * Если метод провайдера недоступен/упал — возвращаем локальное время, но логируем WARN.
 * Идея: на проде обычно все провайдеры реализуют getServerTimeMs, так что fallback должен быть редким.
 */
async function getExchangeServerTimeMsSafe(
  provider: MarketDataProvider,
  marketType: MarketType,
): Promise<number> {
  const providerAny = provider as any;
  const hasGetServerTimeMs = typeof providerAny?.getServerTimeMs === 'function';

  if (hasGetServerTimeMs) {
    try {
      const serverTimeMs: number =
        await providerAny.getServerTimeMs(marketType);
      if (Number.isFinite(serverTimeMs)) {
        return serverTimeMs;
      }
    } catch (err) {
      console.warn(
        `[Orchestrator] getServerTimeMs failed: ${(err as Error)?.message ?? err}`,
      );
    }
  }

  const nowFallbackMs = Date.now();
  console.warn(
    `[Orchestrator] using local time as fallback: ${new Date(nowFallbackMs).toISOString()}`,
  );
  return nowFallbackMs;
}

interface Deps {
  symbolRepo: Repository<SymbolEntity>;
  timeframeRepo: Repository<TimeframeEntity>;
  candleRepo: Repository<CandleEntity>;
  marketName: MarketDataProvider; // <- универсальный провайдер
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
  args: Deps & {
    symbolName: string;
    timeframeName: string;
    marketType: MarketType;
    exchange?: ExchangeCode; // default 'binance'
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
    includePartialLatest?: boolean;
  },
) {
  const {
    symbolRepo,
    timeframeRepo,
    candleRepo,
    marketName,
    symbolName,
    timeframeName,
    marketType,
    exchange = 'binance', // единая политика: дефолт биржи на уровне юзкейса
    fromTimestamp,
    toTimestamp,
    limit,
    includePartialLatest = DEFAULT_INCLUDE_PARTIAL_LATEST,
  } = args;

  // 0) «истинное» время — от биржи (устраняем дрейф локальных часов)
  const serverTimeMs = await getExchangeServerTimeMsSafe(
    marketName,
    marketType,
  );

  // 1) Считаем окно запроса, строго выровненное к сетке и не "в будущее"
  const { fromAligned, toAligned, step, limitFinal } = computeRequestRange({
    timeframeName,
    fromTimestamp,
    toTimestamp,
    limit,
    includePartialLatest,
    serverTimeMs,
  });

  console.log(
    `[Orchestrator] range: FROM=${fromAligned} (${new Date(fromAligned).toISOString()}), ` +
      `TO=${toAligned} (${new Date(toAligned).toISOString()}), stepMs=${step}, limit=${limitFinal}, includePartialLatest=${includePartialLatest}`,
  );

  // 2) Пробуем отдать из БД — если окно уже полностью покрыто, выходим быстро
  const initial = await getCandlesFromDb(
    symbolName,
    timeframeName,
    fromAligned,
    toAligned,
    {
      candleRepo,
      symbolRepo,
      timeframeRepo,
      marketType,
      exchange,
    },
  );
  console.log(`[Orchestrator] DB initial len=${initial.length}`);

  // 3) Находим «дыры» (пропуски) в целевом окне
  let gaps = findMissingRanges(initial, fromAligned, toAligned, step);

  if (gaps.length === 0) {
    // База уже покрывает окно — просто отдаем правый срез по лимиту
    return limitFinal && initial.length > limitFinal
      ? initial.slice(-limitFinal)
      : initial;
  }

  // (опционально) режем число окон «дырок», чтобы не уходить в очень глубокую историю
  if (MAX_GAP_FETCHES && gaps.length > MAX_GAP_FETCHES) {
    gaps = gaps.slice(-MAX_GAP_FETCHES); // тянем самые свежие окна
  }

  // 4) Получаем IDs справочников для персиста (symbol/timeframe)
  const symbol = await getOrCreateSymbol(
    symbolRepo,
    symbolName,
    marketType,
    exchange,
  );
  const timeframe = await getOrCreateTimeframe(timeframeRepo, timeframeName);

  // 5) Дотягиваем «дыры» из провайдера:
  //    - сохраняем только ЗАКРЫТЫЕ бары,
  //    - собираем partial-кандидата (самый правый незакрытый)
  const { persistedClosedCount, partialCandidate } =
    await fetchMissingAndPersistClosed({
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
    });
  console.log(`[Orchestrator] fetched closed=${persistedClosedCount}`);

  // 6) Сборка финального ответа:
  //    - перечитать БД,
  //    - при необходимости доклеить partial,
  //    - обрезать по limit
  const result = await assembleResponse({
    symbolName,
    timeframeName,
    marketType,
    exchange,
    fromAligned,
    toAligned,
    includePartialLatest,
    limitFinal,
    candleRepo,
    symbolRepo,
    timeframeRepo,
    partialCandidate,
  });

  return result;
}
