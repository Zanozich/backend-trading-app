import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsIn,
} from 'class-validator';
import {
  MARKET_TYPES,
  EXCHANGES,
  MarketType,
  ExchangeCode,
} from 'src/data-center/domain/market.types';

export class SymbolsQueryDto {
  @IsIn(EXCHANGES)
  @Transform(({ value }) => (value ?? 'binance') as ExchangeCode)
  exchange!: ExchangeCode;

  @IsIn(MARKET_TYPES)
  marketType!: MarketType;

  @IsOptional()
  @IsString()
  q?: string; // поиск по подстроке (case-insensitive)

  @IsOptional()
  @Transform(({ value }) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 200;
    return Math.min(1000, Math.max(1, Math.floor(n)));
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 200;

  @IsOptional()
  @Transform(({ value }) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  })
  @IsInt()
  @Min(0)
  offset: number = 0;

  // на будущее — если добавим колонку is_active в symbols
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return true;
    const v = String(value).toLowerCase();
    return !(v === 'false' || v === '0' || v === 'no');
  })
  activeOnly: boolean = true;
}
