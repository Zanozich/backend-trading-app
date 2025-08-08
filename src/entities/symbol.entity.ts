import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CandleEntity } from './candle.entity';

@Entity({ name: 'symbols' })
export class SymbolEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string; // Пример: BTCUSDT

  @OneToMany(() => CandleEntity, (candle) => candle.symbol)
  candles!: CandleEntity[];
}
