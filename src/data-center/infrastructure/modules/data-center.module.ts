import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataCenterService } from '../../application/data-center.service';
import { CandleEntity } from '../persistence/entities/candle.entity';
import { SymbolEntity } from '../persistence/entities/symbol.entity';
import { TimeframeEntity } from '../persistence/entities/timeframe.entity';
import { MarketDataModule } from 'src/data-center/infrastructure/modules/providers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandleEntity, SymbolEntity, TimeframeEntity]),
    MarketDataModule, // <-- берем реестр отсюда
  ],
  providers: [DataCenterService],
  exports: [DataCenterService],
})
export class DataCenterModule {}
