import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config/typeorm.config';

import { MarketDataApiModule } from './market-data-api/market-data-api.module';
import { DataCenterModule } from './data-center/data-center.module';
import { MarketDataModule } from './providers/market-data.module';

// когда буду делать repair-job
// import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    // ScheduleModule.forRoot(),
    MarketDataModule, // <-- провайдеры рынка и их реестр
    DataCenterModule, // <-- use-cases / application layer
    MarketDataApiModule, // <-- HTTP API (контроллеры)
  ],
})
export class AppModule {}
