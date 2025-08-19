import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DataCenterService } from 'src/data-center/application/data-center.service';
import { CandlesQueryDto } from './dto/candles-query.dto';
import { LoggingService } from 'src/shared/logging/logging.service';

@Controller('candles')
export class MarketDataApiController {
  constructor(
    private readonly dc: DataCenterService,
    private readonly logger: LoggingService, // ADDED
  ) {
    this.logger.setContext('MarketDataApiController'); // ADDED
  }

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

    this.logger.log('GET /candles request', {
      symbol: q.symbol,
      timeframe: q.timeframe,
      marketType: q.marketType,
      exchange: q.exchange,
      from: q.from,
      to: q.to,
      limit: q.limit,
      includePartialLatest: q.includePartialLatest,
    });

    const result = await this.dc.getCandlesData({
      symbolName: q.symbol,
      timeframeName: q.timeframe,
      marketType: q.marketType,
      exchange: q.exchange,
      fromTimestamp: q.from,
      toTimestamp: q.to,
      limit: q.limit,
      includePartialLatest: q.includePartialLatest,
    });

    const elapsed = Date.now() - t0;

    this.logger.setContext('MarketDataApiController');
    this.logger.debug('GET /candles response', {
      elapsedMs: elapsed,
      rows: result.length,
    });

    return result;
  }
}
