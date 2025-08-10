import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { SymbolEntity } from './symbol.entity';
import { TimeframeEntity } from './timeframe.entity';

@Entity({ name: 'candles' })
@Unique('candles_symbol_timeframe_timestamp_key', [
  'symbolId',
  'timeframeId',
  'timestamp',
])
export class CandleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // В БД bigint (мс). В TS работаем как с number через transformer.
  @Column({
    type: 'bigint',
    transformer: {
      to: (v: number) => Math.trunc(v),
      from: (v: string) => Number(v),
    },
  })
  timestamp!: number;

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

  // ---------- FK: SYMBOL ----------
  @Column()
  symbolId!: number;

  @ManyToOne(() => SymbolEntity, (symbol) => symbol.candles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'symbolId' })
  symbol!: SymbolEntity;

  // ---------- FK: TIMEFRAME ----------
  @Column()
  timeframeId!: number;

  @ManyToOne(() => TimeframeEntity, (timeframe) => timeframe.candles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'timeframeId' })
  timeframe!: TimeframeEntity;
}
