import { Controller, Get } from '@nestjs/common';
import { CandlesService } from './candles.service';

@Controller('candles')
export class CandlesController {
  constructor(private readonly candlesService: CandlesService) {}

  @Get()
  async getCandles() {
    return this.candlesService.getCandles();
  }
}
