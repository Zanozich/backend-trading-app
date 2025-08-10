import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { CandlesService } from './candles.service';

function toNumberOrUndefined(x?: string) {
  if (x == null) return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}
function normalizeTsMs(anyTs?: number) {
  if (anyTs == null) return anyTs;
  return anyTs < 1e12 ? anyTs * 1000 : anyTs; // sec → ms
}

@Controller('candles')
export class CandlesController {
  constructor(private readonly candlesService: CandlesService) {}

  @Get()
  async getCandles(
    @Query('symbol') symbol: string,
    @Query('timeframe') timeframe: string,
    @Query('marketType') marketType?: 'spot' | 'futures',
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    if (!symbol || !timeframe || !marketType) {
      throw new BadRequestException('symbol and timeframe are required');
    }

    const from = normalizeTsMs(toNumberOrUndefined(fromStr));
    const to = normalizeTsMs(toNumberOrUndefined(toStr));
    let limit = toNumberOrUndefined(limitStr);

    const mt = (marketType ?? 'spot').toLowerCase() as 'spot' | 'futures';

    console.log(
      `[CandlesController] GET /candles → symbol=${symbol}, timeframe=${timeframe}, marketType=${mt}, from=${from}, to=${to}, limit=${limit}`,
    );

    const start = Date.now();

    const result = await this.candlesService.getCandlesWithAutoFetch({
      symbolName: symbol,
      timeframeName: timeframe,
      marketType: mt,
      fromTimestamp: from,
      toTimestamp: to,
      limit,
    });

    const durationMs = Date.now() - start;
    console.log(
      `[CandlesController] Completed in ${durationMs} ms → returned ${result.length} candles`,
    );

    return result;
  }
}
