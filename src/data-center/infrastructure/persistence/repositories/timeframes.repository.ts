import { Repository } from 'typeorm';
import { TimeframeEntity } from '../entities/timeframe.entity';

/**
 * Находит или создаёт таймфрейм (например, '1h') в таблице timeframes.
 */
export async function getOrCreateTimeframe(
  repo: Repository<TimeframeEntity>,
  name: string,
): Promise<TimeframeEntity> {
  let timeframe = await repo.findOne({ where: { name } });
  if (!timeframe) {
    timeframe = repo.create({ name });
    timeframe = await repo.save(timeframe);
  }
  return timeframe;
}
