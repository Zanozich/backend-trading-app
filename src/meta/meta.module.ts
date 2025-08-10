import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';
import { CatalogSyncService } from './catalog-sync.service';

import { SymbolEntity } from 'src/entities/symbol.entity';

// реестр провайдеров рынка
import { MarketDataModule } from 'src/providers/market-data.module';

@Module({
  imports: [TypeOrmModule.forFeature([SymbolEntity]), MarketDataModule],
  controllers: [MetaController],
  providers: [MetaService, CatalogSyncService],
  exports: [MetaService, CatalogSyncService],
})
export class MetaModule {}
