import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MarketDataApiService } from './market-data-api.service';
import { CandlesQueryDto } from './dto/candles-query.dto';

@Controller('candles')
export class MarketDataApiController {
  constructor(private readonly api: MarketDataApiService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCandles(@Query() q: CandlesQueryDto) {
    // т.к. у нас строгая валидация, сюда приходят уже нормализованные значения:
    // q.symbol, q.timeframe, q.marketType — ОБЯЗАТЕЛЬНЫ
    // q.exchange — дефолт 'binance'
    // q.from/q.to — мс либо undefined
    // q.limit — уже проклампленный

    if (!q.symbol || !q.timeframe || !q.marketType) {
      throw new BadRequestException(
        'symbol, timeframe, marketType are required',
      );
    }

    const t0 = Date.now();

    const result = await this.api.getCandlesWithAutoFetch({
      symbolName: q.symbol,
      timeframeName: q.timeframe,
      marketType: q.marketType,
      exchange: q.exchange,
      fromTimestamp: q.from,
      toTimestamp: q.to,
      limit: q.limit,
      includePartialLatest: q.includePartialLatest,
    });

    console.log(
      `[MarketDataApiController] GET /candles → ` +
        `symbol=${q.symbol}, timeframe=${q.timeframe}, marketType=${q.marketType}, exchange=${q.exchange}, ` +
        `from=${q.from}, to=${q.to}, limit=${q.limit} | ${Date.now() - t0}ms → ${result.length} rows`,
    );

    return result;
  }
}
