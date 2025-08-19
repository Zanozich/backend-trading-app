import { Module } from '@nestjs/common';
import { MarketDataApiController } from './market-data-api.controller';
import { DataCenterModule } from 'src/data-center/infrastructure/modules/data-center.module';
import { MetaController } from './meta.controller';
import { LoggingModule } from 'src/shared/logging/logging.module';

@Module({
  imports: [DataCenterModule, LoggingModule],
  controllers: [MarketDataApiController, MetaController],
})
export class MarketDataApiModule {}
