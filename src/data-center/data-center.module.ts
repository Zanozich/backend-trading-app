import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataCenterService } from './data-center.service';
import { SymbolEntity } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';
import { CandleEntity } from '../entities/candle.entity';
import { BinanceModule } from '../providers/binance/binance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SymbolEntity, TimeframeEntity, CandleEntity]),
    BinanceModule,
  ],
  providers: [DataCenterService],
  exports: [DataCenterService],
})
export class DataCenterModule {}
