import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config/typeorm.config';

import { MarketDataApiModule } from './market-data-api/market-data-api.module';
import { DataCenterModule } from './data-center/infrastructure/modules/data-center.module';
import { MarketDataModule } from './data-center/infrastructure/modules/providers.module';

// когда буду делать repair-job
// import { ScheduleModule } from '@nestjs/schedule';
import { MetaModule } from './meta/meta.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    // ScheduleModule.forRoot(),
    MarketDataModule, // <-- провайдеры рынка и их реестр
    DataCenterModule, // <-- use-cases / application layer
    MarketDataApiModule,
    MetaModule, // <-- HTTP API (контроллеры)
  ],
})
export class AppModule {}
