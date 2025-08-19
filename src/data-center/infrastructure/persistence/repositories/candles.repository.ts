import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { CandleEntity } from '../entities/candle.entity';
import { SymbolEntity } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';

import {
  Candle,
  ExchangeCode,
  MarketType,
} from 'src/data-center/domain/market.types';
import { LoggingService } from 'src/shared/logging/logging.service';

/**
 * Репозиторий свечей.
 * Задачи:
 *   - Быстро читать диапазоны (ASC по времени) — под индекс (symbolId, timeframeId, timestamp DESC)
 *   - Массово сохранять закрытые бары (UPSERT, но без лишних апдейтов)
 */
@Injectable()
export class CandlesRepository {
  private readonly BATCH_SIZE = 1000;

  constructor(
    @InjectRepository(CandleEntity)
    private readonly candleRepo: Repository<CandleEntity>,

    @InjectRepository(SymbolEntity)
    private readonly symbolRepo: Repository<SymbolEntity>,

    @InjectRepository(TimeframeEntity)
    private readonly timeframeRepo: Repository<TimeframeEntity>,

    private readonly logger: LoggingService,
  ) {
    this.logger.setContext('CandlesRepository');
  }

  /**
   * Простой путь «по именам»: находит IDs символа/таймфрейма и затем читает свечи.
   * Удобно для вспомогательных сценариев; в «горячем» пути лучше использовать findRangeByIds().
   *
   * Шаги:
   *  1) Резолвим symbolId по (exchange, marketType, symbolName)
   *  2) Резолвим timeframeId по (timeframeName)
   *  3) Читаем свечи по диапазону [from..to] (мс) — ASC по timestamp
   *  4) Маппим сущности TypeORM → доменные Candle (числа)
   */
  async findRangeByNames(
    symbolName: string,
    timeframeName: string,
    fromTimestamp: number,
    toTimestamp: number,
    opts: { exchange: ExchangeCode; marketType: MarketType },
  ): Promise<Candle[]> {
    const { exchange, marketType } = opts;

    // 1) symbolId
    const symbol = await this.symbolRepo.findOne({
      where: { name: symbolName, type: marketType, exchange: exchange },
      select: ['id'],
    });
    if (!symbol) return [];

    // 2) timeframeId
    const timeframe = await this.timeframeRepo.findOne({
      where: { name: timeframeName },
      select: ['id'],
    });
    if (!timeframe) return [];

    // 3) Чтение по диапазону (ASC). Индекс DESC позволяет обратный скан — доп. сортировки в плане нет.
    const rows = await this.candleRepo.find({
      where: {
        symbolId: symbol.id,
        timeframeId: timeframe.id,
        timestamp: Between(fromTimestamp, toTimestamp),
      },
      order: { timestamp: 'ASC' },
    });

    // 4) Маппинг в доменную модель
    return rows.map((c) => ({
      time: Number(c.timestamp),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    }));
  }

  /**
   * «Горячий» путь: когда FK уже известны (например, после getOrCreate).
   * Дешевле — без дополнительных SELECT по именам.
   */
  async findRangeByIds(
    symbolId: number,
    timeframeId: number,
    fromTimestamp: number,
    toTimestamp: number,
  ): Promise<Candle[]> {
    const rows = await this.candleRepo.find({
      where: {
        symbolId,
        timeframeId,
        timestamp: Between(fromTimestamp, toTimestamp),
      },
      order: { timestamp: 'ASC' },
    });

    return rows.map((c) => ({
      time: Number(c.timestamp),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    }));
  }

  /**
   * Массовая запись закрытых баров.
   *
   * Политика:
   *  - используем «настоящий» UPSERT (TypeORM upsert) — обновляем, если значения изменились,
   *    и пропускаем UPDATE, если всё совпадает (skipUpdateIfNoValuesChanged);
   *  - пишем миллисекунды (c.time) в timestamp;
   *  - пишем батчами фиксированного размера.
   */

  /**
   * Массовая запись закрытых баров (UPSERT по конфликту).
   * Вариант А: принимаем **сущности** (оставлено для обратной совместимости).
   */
  async upsertBatch(
    candles: Candle[],
    symbol: SymbolEntity,
    timeframe: TimeframeEntity,
  ): Promise<void> {
    if (!candles?.length) return;

    // Готовим plain-объекты для upsert (а не сущности)
    const entities: Partial<CandleEntity>[] = candles.map((c) => ({
      symbolId: symbol.id,
      timeframeId: timeframe.id,
      timestamp: c.time, // миллисекунды UTC
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    // Пишем батчами
    for (let i = 0; i < entities.length; i += this.BATCH_SIZE) {
      const slice = entities.slice(i, i + this.BATCH_SIZE);

      await this.candleRepo.upsert(slice, {
        conflictPaths: ['symbolId', 'timeframeId', 'timestamp'],
        skipUpdateIfNoValuesChanged: true,
      });

      this.logger.debug('upsert batch done', {
        batchIndex: Math.floor(i / this.BATCH_SIZE) + 1,
        batchSize: slice.length,
      });
    }

    this.logger.log('upsert completed', { total: entities.length });
  }

  /**
   * Массовая запись закрытых баров по **ID** (без проброса сущностей).
   * Удобно для чистых use-case функций: меньше связности и зависимостей.
   */
  async upsertBatchByIds(
    candles: Candle[],
    symbolId: number,
    timeframeId: number,
  ): Promise<void> {
    if (!candles?.length) return;

    const entities: Partial<CandleEntity>[] = candles.map((c) => ({
      symbolId,
      timeframeId,
      timestamp: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    for (let i = 0; i < entities.length; i += this.BATCH_SIZE) {
      const slice = entities.slice(i, i + this.BATCH_SIZE);

      await this.candleRepo.upsert(slice, {
        conflictPaths: ['symbolId', 'timeframeId', 'timestamp'],
        skipUpdateIfNoValuesChanged: true,
      });

      this.logger.debug('upsertByIds batch done', {
        batchIndex: Math.floor(i / this.BATCH_SIZE) + 1,
        batchSize: slice.length,
      });
    }

    this.logger.log('upsertByIds completed', { total: entities.length });
  }
}
