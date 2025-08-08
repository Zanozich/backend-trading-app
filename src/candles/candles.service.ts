import { Injectable } from '@nestjs/common';
import { DataCenterService } from '../data-center/data-center.service';
import { Candle } from '../data-center/types';

@Injectable()
export class CandlesService {
  constructor(private readonly dataCenterService: DataCenterService) {}

  async getCandles(): Promise<Candle[]> {
    // Временно отключено: мы больше не используем CSV напрямую
    // const candles = await this.dataCenterService.loadCandlesFromCsv();
    // return candles;

    return []; // временный заглушка — позже заменим на fetch из БД
  }
}
