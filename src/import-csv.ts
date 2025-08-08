import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadCandlesFromCsv } from './providers/csv-candles.provider';
import { DataCenterService } from './data-center/data-center.service';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule); // CLI context
  await app.init();

  const filePath = path.join(__dirname, '..', 'data', 'Binance_BTCUSDT_1h.csv');
  const candles = await loadCandlesFromCsv(filePath);

  const symbol = 'BTCUSDT';
  const timeframe = '1h';

  const dataCenter = app.get(DataCenterService);
  await dataCenter.importCandles(candles, symbol, timeframe);

  console.log('✅ CSV import completed');
  await app.close();
}

bootstrap();
