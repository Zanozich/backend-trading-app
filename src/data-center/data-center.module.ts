import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataCenterService } from './data-center.service';
import { SymbolEntity } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';
import { CandleEntity } from '../entities/candle.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SymbolEntity, TimeframeEntity, CandleEntity]),
  ],
  providers: [DataCenterService],
  exports: [DataCenterService],
})
export class DataCenterModule {}
