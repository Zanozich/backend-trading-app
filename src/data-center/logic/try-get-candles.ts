import { Repository } from 'typeorm';
import { CandleEntity } from '../../entities/candle.entity';
import { SymbolEntity } from '../../entities/symbol.entity';
import { TimeframeEntity } from '../../entities/timeframe.entity';
import { saveCandlesToDb } from '../helpers/save-candles-to-db';
import { getCandlesFromDb } from './get-candles-from-db';
import { getOrCreateSymbol } from '../helpers/get-or-create-symbol';
import { getOrCreateTimeframe } from '../helpers/get-or-create-timeframe';
import { Binance } from '../../providers/binance/binance';
import { getIntervalMs } from '../utils/interval-to-ms';
import { MAX_CANDLES_PER_REQUEST } from '../../config/limits';

type MarketType = 'spot' | 'futures';

const MAX_GAP_FETCHES = 3;

interface Deps {
  symbolRepo: Repository<SymbolEntity>;
  timeframeRepo: Repository<TimeframeEntity>;
  candleRepo: Repository<CandleEntity>;
  binance: Binance;
}

function findMissingRanges(
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
      res.push({ start: cursor, end: t - 1 });
    }
    cursor = t + stepMs;
  }
  if (cursor <= to) {
    res.push({ start: cursor, end: to });
  }
  return res;
}

export async function tryGetCandlesFromDbOrFetch(
  args: Deps & {
    symbolName: string;
    timeframeName: string;
    marketType: MarketType;
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
  },
) {
  const {
    symbolRepo,
    timeframeRepo,
    candleRepo,
    binance,
    symbolName,
    timeframeName,
    marketType,
    fromTimestamp,
    toTimestamp,
    limit,
  } = args;

  const step = getIntervalMs(timeframeName);
  const now = Date.now();

  // финальный лимит с нижней/верхней границей
  let limitFinal = Number.isFinite(limit as number)
    ? Number(limit)
    : MAX_CANDLES_PER_REQUEST;
  if (limitFinal < 1) limitFinal = 1;
  if (limitFinal > MAX_CANDLES_PER_REQUEST)
    limitFinal = MAX_CANDLES_PER_REQUEST;

  // TO — не в будущее; если не задан — берём "сейчас"
  let TO = typeof toTimestamp === 'number' ? toTimestamp : now;
  if (TO > now) TO = now;

  // FROM — если не задан, окно на limitFinal баров назад
  let FROM =
    typeof fromTimestamp === 'number' ? fromTimestamp : TO - step * limitFinal;

  if (FROM < 0) FROM = 0;

  const maxSpan = step * limitFinal;
  if (TO - FROM > maxSpan) {
    FROM = TO - maxSpan;
  }

  if (FROM >= TO) {
    FROM = TO - step;
  }

  console.log(
    `[Orchestrator] range: FROM=${FROM} (${new Date(FROM).toISOString()}), ` +
      `TO=${TO} (${new Date(TO).toISOString()}), stepMs=${step}, limit=${limitFinal}`,
  );

  const initial = await getCandlesFromDb(symbolName, timeframeName, FROM, TO, {
    candleRepo,
    symbolRepo,
    timeframeRepo,
    marketType,
  });
  console.log(`[Orchestrator] DB initial len=${initial.length}`);

  const gaps = findMissingRanges(initial, FROM, TO, step);
  if (gaps.length === 0) {
    return limitFinal && initial.length > limitFinal
      ? initial.slice(-limitFinal)
      : initial;
  }

  const symbol = await getOrCreateSymbol(symbolRepo, symbolName, marketType);
  const timeframe = await getOrCreateTimeframe(timeframeRepo, timeframeName);

  let fetchedTotal = 0;
  for (const { start, end } of gaps) {
    const klines = await binance.fetchCandles(
      marketType,
      symbolName.toUpperCase(),
      timeframeName,
      start,
      end,
    );
    fetchedTotal += klines.length;
    if (klines.length) {
      await saveCandlesToDb(klines, candleRepo, symbol, timeframe);
    }
  }
  console.log(`[Orchestrator] Binance fetched missing=${fetchedTotal}`);

  const after = await getCandlesFromDb(symbolName, timeframeName, FROM, TO, {
    candleRepo,
    symbolRepo,
    timeframeRepo,
    marketType,
  });
  console.log(`[Orchestrator] DB after-save len=${after.length}`);

  return limitFinal && after.length > limitFinal
    ? after.slice(-limitFinal)
    : after;
}
