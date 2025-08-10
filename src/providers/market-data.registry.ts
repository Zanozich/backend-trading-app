import { Injectable } from '@nestjs/common';
import { MarketDataProvider } from 'src/domain/market-data.provider';
import { ExchangeCode } from 'src/domain/market.types';

@Injectable()
export class MarketDataRegistry {
  private readonly providers = new Map<ExchangeCode, MarketDataProvider>();

  register(provider: MarketDataProvider) {
    this.providers.set(provider.exchange, provider);
  }

  get(exchange: ExchangeCode): MarketDataProvider {
    const p = this.providers.get(exchange);
    if (!p) {
      throw new Error(
        `No market data provider registered for exchange: ${exchange}`,
      );
    }
    return p;
  }
}
