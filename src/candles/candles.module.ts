import { Module } from '@nestjs/common';
import { CandlesService } from './candles.service';
import { CandlesController } from './candles.controller';

@Module({
  controllers: [CandlesController],
  providers: [CandlesService],
})
export class CandlesModule {}
