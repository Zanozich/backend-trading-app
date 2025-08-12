import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MetaController } from '../data-center/interface/http/meta.controller';
import { MetaService } from '../data-center/application/meta/meta.service';
import { CatalogSyncService } from '../data-center/application/meta/catalog-sync.service';

import { SymbolEntity } from 'src/data-center/infrastructure/persistence/entities/symbol.entity';

// реестр провайдеров рынка
import { MarketDataModule } from 'src/data-center/infrastructure/modules/providers.module';

@Module({
  imports: [TypeOrmModule.forFeature([SymbolEntity]), MarketDataModule],
  controllers: [MetaController],
  providers: [MetaService, CatalogSyncService],
  exports: [MetaService, CatalogSyncService],
})
export class MetaModule {}
