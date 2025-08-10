import { Module } from '@nestjs/common';
import { Binance } from './binance';

@Module({
  providers: [Binance],
  exports: [Binance],
})
export class BinanceModule {}
