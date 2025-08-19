import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SymbolEntity } from '../entities/symbol.entity';
import { ExchangeCode, MarketType } from 'src/data-center/domain/market.types';
import { LoggingService } from 'src/shared/logging/logging.service';

/**
 * Репозиторий символов.
 * Задача: гарантированно получить запись по (exchange, type, name), создать при отсутствии.
 * Важно: обрабатываем гонку на уникальном ключе (get-or-create паттерн).
 */
@Injectable()
export class SymbolsRepository {
  constructor(
    @InjectRepository(SymbolEntity)
    private readonly repo: Repository<SymbolEntity>,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext('SymbolsRepository');
  }

  /**
   * Получить или создать символ.
   *
   * Шаги:
   *  1) Пытаемся найти запись (уникальность по (exchange, type, name))
   *  2) Если нет — создаём и пробуем сохранить
   *  3) Если save упал на уникальности (гонка с другой нодой/потоком) — повторно читаем
   */
  async getOrCreate(args: {
    exchange: ExchangeCode;
    marketType: MarketType;
    name: string;
  }): Promise<SymbolEntity> {
    const { exchange, marketType, name } = args;

    // 1) Пробуем найти
    let row = await this.repo.findOne({
      where: { exchange, type: marketType, name },
    });
    if (row) return row;

    // 2) Создаём и пробуем сохранить
    row = this.repo.create({ exchange, type: marketType, name });

    try {
      const saved = await this.repo.save(row);
      this.logger.debug('created symbol', {
        exchange,
        marketType,
        name,
        id: saved.id,
      });
      return saved;
    } catch (err) {
      // 3) На случай гонки: кто-то уже успел вставить — просто перечитываем
      const again = await this.repo.findOne({
        where: { exchange, type: marketType, name },
      });
      if (!again) {
        this.logger.error('getOrCreate failed', err, {
          exchange,
          marketType,
          name,
        });
        throw err;
      }
      return again;
    }
  }
}
