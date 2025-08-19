import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config/typeorm.config';

import { MarketDataApiModule } from './data-center/interface/http/market-data-api.module';
import { DataCenterModule } from './data-center/infrastructure/modules/data-center.module';
import { ProvidersModule } from './data-center/infrastructure/modules/providers.module';

// когда буду делать repair-job
// import { ScheduleModule } from '@nestjs/schedule';
import { LoggingModule } from './shared/logging/logging.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    // ScheduleModule.forRoot(),
    ProvidersModule, // <-- провайдеры рынка и их реестр
    DataCenterModule, // <-- use-cases / application layer
    MarketDataApiModule, // <-- HTTP API (контроллеры)
    LoggingModule,
  ],
})
export class AppModule {}
