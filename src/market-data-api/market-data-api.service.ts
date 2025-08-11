import { Injectable } from '@nestjs/common';
import { ExchangeCode, MarketType } from 'src/domain/market.types';
import { DataCenterService } from '../data-center/data-center.service';

@Injectable()
export class MarketDataApiService {
  constructor(private readonly dataCenterService: DataCenterService) {}

  async getCandlesWithAutoFetch(args: {
    symbolName: string;
    timeframeName: string;
    marketType: MarketType;
    exchange?: ExchangeCode;
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
    includePartialLatest?: boolean;
  }) {
    return this.dataCenterService.getCandlesData(args);
  }
}
