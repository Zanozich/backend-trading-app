import { Repository } from 'typeorm';
import { SymbolEntity } from '../entities/symbol.entity';
import { ExchangeCode, MarketType } from 'src/data-center/domain/market.types';

export async function getOrCreateSymbol(
  repo: Repository<SymbolEntity>,
  name: string,
  type: MarketType,
  exchange: ExchangeCode, // ← новый параметр
): Promise<SymbolEntity> {
  let symbol = await repo.findOne({ where: { name, type, exchange } });

  if (!symbol) {
    symbol = repo.create({ name, type, exchange });
    symbol = await repo.save(symbol);
    console.log(`🆕 Created symbol: ${name} (${type}) (${exchange})`);
  }

  return symbol;
}
