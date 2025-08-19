import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TimeframeEntity } from '../entities/timeframe.entity';
import { LoggingService } from 'src/shared/logging/logging.service';

/**
 * Репозиторий таймфреймов.
 * Задача: гарантированно получить запись по name, создать при отсутствии.
 * Паттерн такой же, как в SymbolsRepository: get-or-create с защитой от гонки на уникальности.
 */
@Injectable()
export class TimeframesRepository {
  constructor(
    @InjectRepository(TimeframeEntity)
    private readonly repo: Repository<TimeframeEntity>,
    private readonly logger: LoggingService,
  ) {
    this.logger.setContext('TimeframesRepository');
  }

  /**
   * Получить или создать таймфрейм.
   *
   * Шаги:
   *  1) Читаем по name
   *  2) Если нет — создаём и сохраняем
   *  3) При ошибке уникальности — повторное чтение
   */
  async getOrCreate(args: { name: string }): Promise<TimeframeEntity> {
    const { name } = args;

    // 1) Пробуем найти
    let row = await this.repo.findOne({ where: { name } });
    if (row) return row;

    // 2) Создаём и сохраняем
    row = this.repo.create({ name });

    try {
      const saved = await this.repo.save(row);
      this.logger.debug('created timeframe', { name, id: saved.id });
      return saved;
    } catch (err) {
      // 3) Гонка на уникальности — повторное чтение
      const again = await this.repo.findOne({ where: { name } });
      if (!again) {
        this.logger.error('getOrCreate failed', err, { name });
        throw err;
      }
      return again;
    }
  }
}
