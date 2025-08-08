import { Module } from '@nestjs/common';
import { Binance } from './binance';

@Module({
  providers: [Binance],
})
export class BinanceModule {}
