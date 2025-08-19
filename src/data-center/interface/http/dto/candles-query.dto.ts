import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { DEFAULT_INCLUDE_PARTIAL_LATEST } from 'src/data-center/application/config/limits';
import {
  ExchangeCode,
  MarketType,
  EXCHANGES,
  MARKET_TYPES,
} from 'src/data-center/domain/market.types';

const toNumberOrUndefined = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
};

const normalizeTsMs = (v?: number) => {
  if (v == null) return undefined;
  // если пришли секунды — конвертируем в миллисекунды
  return v < 1e12 ? v * 1000 : v;
};

export class CandlesQueryDto {
  @IsString()
  symbol!: string; // e.g. BTCUSDT

  @IsString()
  timeframe!: string; // e.g. 1m, 5m, 1h, 1d

  @IsIn(MARKET_TYPES)
  marketType!: MarketType;

  @IsOptional()
  @IsIn(EXCHANGES)
  @Transform(({ value }) => (value ?? 'binance') as ExchangeCode) // дефолт
  exchange?: ExchangeCode;

  @IsOptional()
  @Transform(({ value }) => normalizeTsMs(toNumberOrUndefined(value)))
  @IsInt()
  @Min(0)
  from?: number;

  @IsOptional()
  @Transform(({ value }) => normalizeTsMs(toNumberOrUndefined(value)))
  @IsInt()
  @Min(0)
  to?: number;

  @IsOptional()
  @Transform(({ value }) => {
    const n = toNumberOrUndefined(value);
    if (n == null) return undefined;
    const MAX = 10000;
    const MIN = 1;
    return Math.max(MIN, Math.min(MAX, n));
  })
  @IsInt()
  @IsPositive()
  limit?: number;

  // Отдавать ли текущий формирующийся бар в ответе (в БД не сохраняется)
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return DEFAULT_INCLUDE_PARTIAL_LATEST;
    const v = String(value).toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  })
  includePartialLatest?: boolean;
}
