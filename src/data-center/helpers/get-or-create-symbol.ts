import { Repository } from 'typeorm';
import { SymbolEntity } from '../../entities/symbol.entity';

/**
 * Находит или создаёт символ (например, BTCUSDT) в таблице symbols.
 */
export async function getOrCreateSymbol(
  repo: Repository<SymbolEntity>,
  name: string,
): Promise<SymbolEntity> {
  let symbol = await repo.findOne({ where: { name } });
  if (!symbol) {
    symbol = repo.create({ name });
    symbol = await repo.save(symbol);
  }
  return symbol;
}
