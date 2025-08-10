import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { CandleEntity } from './candle.entity';

export type MarketType = 'spot' | 'futures';
export type ExchangeCode = 'binance' | 'bybit' | 'okx'; // расширяй по мере добавления провайдеров

@Entity({ name: 'symbols' })
@Unique(['name', 'type', 'exchange']) // ← составная уникальность
export class SymbolEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; // напр. 'BTCUSDT'

  @Column({ type: 'varchar' })
  type!: MarketType; // 'spot' | 'futures'

  @Column({ type: 'varchar', default: 'binance' })
  exchange!: ExchangeCode; // 'binance' (по умолчанию), дальше — Bybit/OKX etc.

  @OneToMany(() => CandleEntity, (candle) => candle.symbol)
  candles!: CandleEntity[];
}
