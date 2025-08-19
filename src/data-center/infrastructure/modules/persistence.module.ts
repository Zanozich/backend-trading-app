import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingModule } from 'src/shared/logging/logging.module';
import { CandleEntity } from '../persistence/entities/candle.entity';
import { SymbolEntity } from '../persistence/entities/symbol.entity';
import { TimeframeEntity } from '../persistence/entities/timeframe.entity';

import { CandlesRepository } from '../persistence/repositories/candles.repository';
import { SymbolsRepository } from '../persistence/repositories/symbols.repository';
import { TimeframesRepository } from '../persistence/repositories/timeframes.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([SymbolEntity, TimeframeEntity, CandleEntity]),
    LoggingModule,
  ],
  providers: [CandlesRepository, SymbolsRepository, TimeframesRepository],
  exports: [
    TypeOrmModule,
    CandlesRepository,
    SymbolsRepository,
    TimeframesRepository,
  ],
})
export class PersistenceModule {}
