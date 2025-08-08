import { Module } from '@nestjs/common';
import { CandlesService } from './candles.service';
import { CandlesController } from './candles.controller';
import { DataCenterModule } from '../data-center/data-center.module';

@Module({
  imports: [DataCenterModule],
  controllers: [CandlesController],
  providers: [CandlesService],
})
export class CandlesModule {}
