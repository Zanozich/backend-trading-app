import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MarketDataRegistry } from 'src/providers/market-data.registry';
import { SymbolEntity } from 'src/entities/symbol.entity';
import { ExchangeCode, MarketType } from 'src/domain/market.types';

// Типы Binance — локальные у провайдера; тут используем "any" через мягкую привязку,
// чтобы не тащить бинанс-специфику в домен.
@Injectable()
export class CatalogSyncService {
  constructor(
    private readonly registry: MarketDataRegistry,
    @InjectRepository(SymbolEntity)
    private readonly symbolRepo: Repository<SymbolEntity>,
  ) {}

  /**
   * Синхронизирует список символов для given exchange/marketType из провайдера в БД.
   * Возвращает кол-во upsert-ов (вставок/обновлений).
   */
  async syncSymbols(
    exchange: ExchangeCode,
    marketType: MarketType,
  ): Promise<number> {
    const provider = this.registry.get(exchange);

    // Бинанс-специфичный метод — ожидаем, что провайдер его поддерживает
    const getExchangeInfo = (provider as any).getExchangeInfo;
    if (typeof getExchangeInfo !== 'function') {
      throw new Error(
        `Provider "${exchange}" doesn't support getExchangeInfo() yet`,
      );
    }

    const info = await getExchangeInfo.call(provider, marketType);
    // Binance shape: { symbols: Array<{ symbol, status, ... }> }
    const raw = Array.isArray(info?.symbols) ? info.symbols : [];

    // берём только активные торговые инструменты
    const tradables = raw.filter(
      (s: any) => String(s.status).toUpperCase() === 'TRADING',
    );

    if (tradables.length === 0) return 0;

    // Upsert по (name,type,exchange)
    // TypeORM v0.3: repository.upsert(entityLike[], conflictPaths)
    const payload = tradables.map((s: any) => ({
      name: String(s.symbol),
      type: marketType,
      exchange,
    }));

    const res = await this.symbolRepo.upsert(payload, {
      conflictPaths: ['name', 'type', 'exchange'],
      skipUpdateIfNoValuesChanged: true,
    });

    // res.identifiers.length НЕ всегда отражает точное число операций,
    // поэтому возвращаем просто размер входного набора как ориентир.
    return payload.length;
  }
}
