import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index, // ADDED
} from 'typeorm';
import { SymbolEntity } from './symbol.entity';
import { TimeframeEntity } from './timeframe.entity';

@Entity({ name: 'candles' })
@Unique('candles_symbol_timeframe_timestamp_key', [
  'symbolId',
  'timeframeId',
  'timestamp',
])
@Index('idx_candles_symbol_timeframe_ts_desc', [
  'symbolId',
  'timeframeId',
  'timestamp',
]) // ADDED
export class CandleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * В БД: BIGINT (мс). В TS: number.
   * Трансформер конвертирует строку из PG в number, и обратно при записи.
   */
  @Column({
    type: 'bigint',
    transformer: {
      to: (v: number | null | undefined) => v ?? null, // ADDED: аккуратнее, чем Math.trunc
      from: (v: string | null) => (v == null ? 0 : Number(v)), // ADDED
    },
  })
  timestamp!: number;

  // Цены/объём — числа. У тебя double precision (typeorm: 'float') — это ок.
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
