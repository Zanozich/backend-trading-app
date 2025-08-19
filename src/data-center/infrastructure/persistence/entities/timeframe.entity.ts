import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CandleEntity } from './candle.entity';

@Entity({ name: 'timeframes' })
export class TimeframeEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string; // Пример: 1h

  @OneToMany(() => CandleEntity, (candle) => candle.timeframe)
  candles!: CandleEntity[];
}
