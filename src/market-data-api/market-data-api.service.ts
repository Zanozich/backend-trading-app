import { Injectable } from '@nestjs/common';
import { DataCenterService } from '../data-center/data-center.service';

type MarketType = 'spot' | 'futures';

@Injectable()
export class MarketDataApiService {
  constructor(private readonly dataCenterService: DataCenterService) {}

  async getCandlesWithAutoFetch(args: {
    symbolName: string;
    timeframeName: string;
    marketType: MarketType;
    fromTimestamp?: number;
    toTimestamp?: number;
    limit?: number;
  }) {
    return this.dataCenterService.tryGetCandlesFromDbOrFetch(args);
  }
}
