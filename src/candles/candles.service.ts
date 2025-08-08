// src/candles/candles.service.ts
import { Injectable } from '@nestjs/common';
import { DataCenterService } from '../data-center/data-center.service';
import { Candle } from '../data-center/types';

@Injectable()
export class CandlesService {
  constructor(private readonly dataCenterService: DataCenterService) {}

  async getCandles(symbol: string, timeframe: string): Promise<Candle[]> {
    return await this.dataCenterService.getCandlesFromDb(symbol, timeframe);
  }
}
