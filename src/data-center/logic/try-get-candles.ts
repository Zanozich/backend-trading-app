import { Repository } from 'typeorm';

import { CandleEntity } from '../../entities/candle.entity';
import { SymbolEntity } from '../../entities/symbol.entity';
import { TimeframeEntity } from '../../entities/timeframe.entity';

import { saveCandlesToDb } from '../helpers/save-candles-to-db';
import { getCandlesFromDb } from './get-candles-from-db';
import { getOrCreateSymbol } from '../helpers/get-or-create-symbol';
import { getOrCreateTimeframe } from '../helpers/get-or-create-timeframe';

// хелперы по расчету ренджа+поиск пропусков в информации
import { computeRequestRange } from './range/compute-request-range';
import { findMissingRanges } from './range/find-missing-ranges';

// Политики приложения (лимиты/ретраи)
import {
  HTTP_MAX_RETRIES_MARKETDATA,
  HTTP_RETRY_BASE_DELAY_MS,
  HTTP_RETRY_FACTOR,
  HTTP_RETRY_MAX_DELAY_MS,
  HTTP_RETRY_JITTER,
  MAX_GAP_FETCHES,
  TAIL_RECONCILIATION_BARS,
} from '../../config/limits';

// Универсальный ретрай-хелпер
import { retry } from './retry';
// Доменные типы
import { MarketType, ExchangeCode } from 'src/domain/market.types';
import { MarketDataProvider } from 'src/domain/market-data.provider';

interface Deps {
  symbolRepo: Repository<SymbolEntity>;
  timeframeRepo: Repository<TimeframeEntity>;
  candleRepo: Repository<CandleEntity>;
  marketName: MarketDataProvider; // <- универсальный провайдер
}

/**
 * Юзкейс «получить свечи, при необходимости автодофетчив недостающее»
 *
 * Алгоритм:
 * 1) computeRequestRange → нормализуем окно (limit, выравнивание, не в будущее)
 * 2) читаем БД по окну
 * 3) findMissingRanges → определяем «дыры»
 * 4) если есть «дыры» — дотягиваем из провайдера с ретраями, сохраняем батчами
 * 5) перечитываем окно из БД и обрезаем до limit
 */
export async function tryGetCandlesFromDbOrFetch(
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
    exchange = 'binance', // дефолт биржи — единая политика на уровне юзкейса
    fromTimestamp,
    toTimestamp,
    limit,
    includePartialLatest = false,
  } = args;

  // 1) диапазон окна
  const { fromAligned, toAligned, step, limitFinal } = computeRequestRange({
    timeframeName,
    fromTimestamp,
    toTimestamp,
    limit,
    includePartialLatest,
  });

  console.log(
    `[Orchestrator] range: FROM=${fromAligned} (${new Date(fromAligned).toISOString()}), ` +
      `TO=${toAligned} (${new Date(toAligned).toISOString()}), stepMs=${step}, limit=${limitFinal}, includePartialLatest=${includePartialLatest}`,
  );

  // 2) читаем из БД
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

  // 3) дыры
  let gaps = findMissingRanges(initial, fromAligned, toAligned, step);

  if (gaps.length === 0) {
    // Обрезка до лимита на случай, если в окне записей больше limitFinal
    return limitFinal && initial.length > limitFinal
      ? initial.slice(-limitFinal)
      : initial;
  }

  // (опц.) ограничить число «окон» для fetch (защита от очень дырявых промежутков)
  if (MAX_GAP_FETCHES && gaps.length > MAX_GAP_FETCHES) {
    gaps = gaps.slice(-MAX_GAP_FETCHES); // тянем последние (самые свежие) окна
  }

  // 4) справочники (IDs)
  const symbol = await getOrCreateSymbol(
    symbolRepo,
    symbolName,
    marketType,
    exchange,
  );
  const timeframe = await getOrCreateTimeframe(timeframeRepo, timeframeName);

  // 5) дотягиваем по «окнам» с ретраями
  let fetchedTotal = 0;
  for (const { start, end } of gaps) {
    const klines = await retry(
      () =>
        marketName.fetchCandles(
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
        console.warn(
          `[Orchestrator] fetch retry #${attempt} in ${delay}ms for ${symbolName} ${timeframeName} [${start}..${end}]:`,
          (err as Error)?.message ?? err,
        );
      },
    );

    // сохраняем только ЗАКРЫТЫЕ бары (доп. защита, если провайдер вернёт текущий бар)
    const now = Date.now();
    const closedOnly = klines.filter((c) => c.time + step <= now);
    fetchedTotal += closedOnly.length;
    if (closedOnly.length) {
      await saveCandlesToDb(closedOnly, candleRepo, symbol, timeframe);
    }
  }
  console.log(`[Orchestrator] Binance fetched missing=${fetchedTotal}`);

  // 5.1) (опц.) хвостовая реконсиляция последних K закрытых баров
  // Перезапросить и upsert'нуть последние K баров, даже если "дыр" не было.
  // Полезно на случай редких правок закрытых баров у провайдера.
  if (TAIL_RECONCILIATION_BARS && TAIL_RECONCILIATION_BARS > 0) {
    const k = Math.floor(TAIL_RECONCILIATION_BARS);
    const tailStart = toAligned - step * (k - 1);
    if (tailStart <= toAligned) {
      const tail = await retry(
        () =>
          marketName.fetchCandles(
            marketType,
            symbolName.toUpperCase(),
            timeframeName,
            tailStart,
            toAligned,
          ),
        {
          retries: HTTP_MAX_RETRIES_MARKETDATA,
          baseDelayMs: HTTP_RETRY_BASE_DELAY_MS,
          factor: HTTP_RETRY_FACTOR,
          maxDelayMs: HTTP_RETRY_MAX_DELAY_MS,
          jitter: HTTP_RETRY_JITTER,
        },
      );
      const now = Date.now();
      const closedTail = tail.filter((c) => c.time + step <= now);
      if (closedTail.length) {
        await saveCandlesToDb(closedTail, candleRepo, symbol, timeframe);
      }
    }
  }

  // 6) перечитываем по выровненному окну и отдаем не больше limit
  const after = await getCandlesFromDb(
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
  console.log(`[Orchestrator] DB after-save len=${after.length}`);

  return limitFinal && after.length > limitFinal
    ? after.slice(-limitFinal)
    : after;
}
