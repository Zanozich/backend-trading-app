import { Repository, Between } from 'typeorm';
import { SymbolEntity } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';
import { CandleEntity } from '../entities/candle.entity';
import { Candle } from 'src/data-center/domain/market.types';
import { MarketType, ExchangeCode } from '../../../domain/market.types';

export async function findRange(
  symbolName: string,
  timeframeName: string,
  fromTimestamp: number, // ms
  toTimestamp: number, // ms
  deps: {
    candleRepo: Repository<CandleEntity>;
    symbolRepo: Repository<SymbolEntity>;
    timeframeRepo: Repository<TimeframeEntity>;
    marketType: MarketType;
    exchange: ExchangeCode;
  },
): Promise<Candle[]> {
  const { symbolRepo, timeframeRepo, candleRepo, marketType, exchange } = deps;

  // Ищем символ строго по (name, type, exchange)
  const symbol = await symbolRepo.findOne({
    where: { name: symbolName, type: marketType, exchange },
  });
  if (!symbol) return [];

  const timeframe = await timeframeRepo.findOne({
    where: { name: timeframeName },
  });
  if (!timeframe) return [];

  // Фильтруем по FK, используем диапазон по timestamp
  const rows = await candleRepo.find({
    where: {
      symbolId: symbol.id,
      timeframeId: timeframe.id,
      timestamp: Between(fromTimestamp, toTimestamp),
    },
    order: { timestamp: 'ASC' },
  });

  return rows.map((c) => ({
    time: Number(c.timestamp),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

/**
 * Батч-вставка свечей в Postgres.
 * Дубликаты по ("symbolId","timeframeId","timestamp") игнорируются на уровне SQL:
 *   ON CONFLICT ("symbolId","timeframeId","timestamp") DO NOTHING
 * Пишем "timestamp" в МИЛЛИСЕКУНДАХ → берём из c.time.
 */
export async function upsertBatch(
  candles: Candle[],
  candleRepo: Repository<CandleEntity>,
  symbol: SymbolEntity,
  timeframe: TimeframeEntity,
): Promise<void> {
  if (!candles.length) return;

  const BATCH_SIZE = 1000;
  let insertedTotal = 0;

  for (let i = 0; i < candles.length; i += BATCH_SIZE) {
    const batch = candles.slice(i, i + BATCH_SIZE);

    // Готовим «сырые» значения с явными FK-колонками
    const values = batch.map((c) => ({
      timestamp: c.time, // миллисекунды
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      symbolId: symbol.id, // camelCase — как в БД
      timeframeId: timeframe.id, // camelCase — как в БД
    }));

    // ВАЖНО: для Postgres используем onConflict с кавычками вокруг camelCase колонок
    const result = await candleRepo
      .createQueryBuilder()
      .insert()
      .values(values as any)
      .onConflict('("symbolId","timeframeId","timestamp") DO NOTHING')
      .returning('id') // даёт реальное кол-во вставленных строк
      .execute();

    const inserted = Array.isArray(result.raw) ? result.raw.length : 0;
    insertedTotal += inserted;

    console.log(
      `✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: requested=${values.length}, inserted=${inserted}`,
    );
  }

  console.log(
    `✅ Done: requested=${candles.length}, actually_inserted=${insertedTotal}`,
  );
}
