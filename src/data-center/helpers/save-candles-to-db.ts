import { Repository } from 'typeorm';
import { Candle } from '../types';
import { CandleEntity } from '../../entities/candle.entity';
import { SymbolEntity } from '../../entities/symbol.entity';
import { TimeframeEntity } from '../../entities/timeframe.entity';

/**
 * Сохраняет массив свечей в базу данных через TypeORM батчами.
 * Привязывает каждую свечу к заданным symbol и timeframe.
 */
export async function saveCandlesToDb(
  candles: Candle[],
  candleRepo: Repository<CandleEntity>,
  symbol: SymbolEntity,
  timeframe: TimeframeEntity,
): Promise<void> {
  const BATCH_SIZE = 500; // безопасный размер, можно увеличить до 1000 при необходимости

  for (let i = 0; i < candles.length; i += BATCH_SIZE) {
    const chunk = candles.slice(i, i + BATCH_SIZE);

    const entities: CandleEntity[] = chunk.map((c) =>
      candleRepo.create({
        timestamp: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        symbol,
        timeframe,
      }),
    );

    await candleRepo.save(entities);
    console.log(
      `✅ Saved batch ${i / BATCH_SIZE + 1} (${entities.length} candles)`,
    );
  }

  console.log(`✅ All ${candles.length} candles saved to DB in chunks`);
}
