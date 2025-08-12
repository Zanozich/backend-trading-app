import { Module, OnModuleInit } from '@nestjs/common';
import { MarketDataRegistry } from '../registry/market-data.registry';
import { BinanceProvider } from '../providers/binance/binance.provider';

@Module({
  providers: [MarketDataRegistry, BinanceProvider],
  exports: [MarketDataRegistry], // наружу отдаем только реестр
})
export class MarketDataModule implements OnModuleInit {
  constructor(
    private readonly registry: MarketDataRegistry,
    private readonly binance: BinanceProvider,
  ) {}

  onModuleInit() {
    this.registry.register(this.binance);
    // в будущем: this.registry.register(this.bybit), etc.
  }
}
