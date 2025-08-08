// src/data-center/helpers/get-or-create-symbol.ts

import { Repository } from 'typeorm';
import { SymbolEntity, MarketType } from '../../entities/symbol.entity';

export async function getOrCreateSymbol(
  repo: Repository<SymbolEntity>,
  name: string,
  type: MarketType,
): Promise<SymbolEntity> {
  let symbol = await repo.findOne({ where: { name, type } });

  if (!symbol) {
    symbol = repo.create({ name, type });
    await repo.save(symbol);
    console.log(`🆕 Created symbol: ${name} (${type})`);
  }

  return symbol;
}
