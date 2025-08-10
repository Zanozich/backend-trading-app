import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataCenterService } from './data-center.service';
import { CandleEntity } from '../entities/candle.entity';
import { SymbolEntity } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';
import { MarketDataModule } from 'src/providers/market-data.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandleEntity, SymbolEntity, TimeframeEntity]),
    MarketDataModule, // <-- берем реестр отсюда
  ],
  providers: [DataCenterService],
  exports: [DataCenterService],
})
export class DataCenterModule {}
