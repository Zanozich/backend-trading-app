import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { SymbolEntity } from './symbol.entity';
import { TimeframeEntity } from './timeframe.entity';

@Entity({ name: 'candles' })
@Index(['symbol', 'timeframe', 'timestamp'], { unique: true }) // для уникальности
export class CandleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  timestamp!: number; // unix time (в секундах)

  @Column('float')
  open!: number;

  @Column('float')
  high!: number;

  @Column('float')
  low!: number;

  @Column('float')
  close!: number;

  @Column('float')
  volume!: number;

  @ManyToOne(() => SymbolEntity, (symbol) => symbol.candles)
  symbol!: SymbolEntity;

  @ManyToOne(() => TimeframeEntity, (timeframe) => timeframe.candles)
  timeframe!: TimeframeEntity;
}
