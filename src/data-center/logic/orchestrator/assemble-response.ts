import { Repository } from 'typeorm';
import { Candle, ExchangeCode, MarketType } from 'src/domain/market.types';
import { CandleEntity } from '../../../entities/candle.entity';
import { SymbolEntity } from '../../../entities/symbol.entity';
import { TimeframeEntity } from '../../../entities/timeframe.entity';
import { getCandlesFromDb } from '../get-candles-from-db';

/**
 * Перечитывает итоговое окно из БД, опционально доклеивает частичный бар,
 * и обрезает по limit.
 *
 * Инварианты:
 *  - БД содержит ТОЛЬКО закрытые бары;
 *  - partialCandidate (если есть) — это НЕперсистентный «живой» бар из провайдера;
 *  - дублей по time быть не должно.
 */
export async function assembleResponse(params: {
  symbolName: string;
  timeframeName: string;
  marketType: MarketType;
  exchange: ExchangeCode;
  fromAligned: number; // левая граница (включительно)
  toAligned: number; // правая граница (включительно)
  includePartialLatest: boolean;
  limitFinal?: number;

  // persistence
  candleRepo: Repository<CandleEntity>;
  symbolRepo: Repository<SymbolEntity>;
  timeframeRepo: Repository<TimeframeEntity>;

  // кандидат частичного бара (может быть undefined)
  partialCandidate?: Candle;
}): Promise<Candle[]> {
  const {
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
  } = params;

  // 1) После дотяжки закрытых перечитываем окно — тут всё консистентно и отсортировано
  let rows = await getCandlesFromDb(
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
  console.log(`[Orchestrator] DB after-save len=${rows.length}`);

  // 2) Доклеить частичный бар в ОТВЕТ (НЕ в БД), если он попадает в наше окно
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
