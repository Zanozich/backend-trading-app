import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { CandleEntity } from './candle.entity';

export type MarketType = 'spot' | 'futures';

@Entity({ name: 'symbols' })
@Unique(['name', 'type']) // <-- составная уникальность
export class SymbolEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column() // <-- без unique: true
  name!: string;

  @Column({ type: 'varchar' })
  type!: MarketType; // 'spot' | 'futures'

  @OneToMany(() => CandleEntity, (candle) => candle.symbol)
  candles!: CandleEntity[];
}
