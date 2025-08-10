import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataCenterService } from './data-center/data-center.service';
import { MarketType } from './entities/symbol.entity';
import { parseCandlesFromCsv } from './data-center/helpers/parse-csv-candles';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const filePath = path.join(__dirname, '..', 'data', 'Binance_BTCUSDT_1h.csv');
  const candles = await parseCandlesFromCsv(filePath); // <-- меняем источник
  console.log('Parsed candles:', candles.length); // <— добавь это

  const symbol = 'BTCUSDT';
  const timeframe = '1h';
  const marketType: MarketType = 'spot'; // явный тип рынка

  const dataCenter = app.get(DataCenterService);
  await dataCenter.importCandles(candles, symbol, timeframe, marketType);

  console.log('✅ CSV import completed');
  await app.close();
}

bootstrap();
