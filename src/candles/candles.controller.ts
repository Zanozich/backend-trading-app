// src/candles/candles.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common/exceptions';
import { CandlesService } from './candles.service';

@Controller('candles')
export class CandlesController {
  constructor(private readonly candlesService: CandlesService) {}

  @Get()
  async getCandles(
    @Query('symbol') symbol?: string,
    @Query('timeframe') timeframe?: string,
  ) {
    if (!symbol || !timeframe) {
      throw new BadRequestException(
        'Missing "symbol" or "timeframe" query param',
      );
    }

    return await this.candlesService.getCandles(symbol, timeframe);
  }
}
