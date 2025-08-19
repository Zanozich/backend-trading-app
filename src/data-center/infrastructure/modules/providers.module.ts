import { Module, OnModuleInit } from '@nestjs/common';
import { MarketDataRegistry } from '../registry/market-data.registry';
import { BinanceProvider } from '../providers/binance/binance.provider';
import { LoggingModule } from 'src/shared/logging/logging.module';

@Module({
  imports: [LoggingModule],
  providers: [MarketDataRegistry, BinanceProvider],
  exports: [MarketDataRegistry],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private readonly registry: MarketDataRegistry,
    private readonly binance: BinanceProvider,
  ) {}

  onModuleInit() {
    this.registry.register(this.binance);
    // в будущем: this.registry.register(this.bybit), etc.
  }
}
