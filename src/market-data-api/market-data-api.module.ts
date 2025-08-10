import { Module } from '@nestjs/common';
import { MarketDataApiService } from './market-data-api.service';
import { MarketDataApiController } from './market-data-api.controller';
import { DataCenterModule } from '../data-center/data-center.module';

@Module({
  imports: [DataCenterModule],
  controllers: [MarketDataApiController],
  providers: [MarketDataApiService],
})
export class MarketDataApiModule {}
