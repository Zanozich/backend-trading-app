// src/entities/symbol.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CandleEntity } from './candle.entity';

export type MarketType = 'spot' | 'futures';

@Entity({ name: 'symbols' })
export class SymbolEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string; // Пример: BTCUSDT

  @Column({ type: 'varchar' })
  type!: MarketType; // spot или futures

  @OneToMany(() => CandleEntity, (candle) => candle.symbol)
  candles!: CandleEntity[];
}
