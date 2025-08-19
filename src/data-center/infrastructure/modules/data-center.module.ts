import { Module } from '@nestjs/common';
import { ProvidersModule } from './providers.module';
import { PersistenceModule } from './persistence.module';
import { DataCenterService } from '../../application/data-center.service';
// import { ClockService } from '../../application/live/clock.service';
import { MetaService } from '../../application/meta/meta.service';
import { CatalogSyncService } from '../../application/meta/catalog-sync.service';
import { LoggingModule } from 'src/shared/logging/logging.module';

@Module({
  imports: [
    PersistenceModule, // БД-слой
    ProvidersModule, // провайдеры бирж + реестр
    LoggingModule,
  ],
  providers: [
    DataCenterService, // application service (тонкий фасад use-cases)
    MetaService,
    CatalogSyncService,
    // ClockService,
  ],
  exports: [
    DataCenterService, // отдаём наружу, чтобы интерфейсы могли инжектить
    MetaService,
    CatalogSyncService,
  ],
})
export class DataCenterModule {}
