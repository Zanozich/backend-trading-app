import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

import { SymbolEntity } from 'src/data-center/infrastructure/persistence/entities/symbol.entity';
import { SymbolsQueryDto } from '../../interface/http/dto/symbols-query.dto';
import { INTERVAL_MS_MAP } from 'src/data-center/domain/timeframes';

@Injectable()
export class MetaService {
  constructor(
    @InjectRepository(SymbolEntity)
    private readonly symbolRepo: Repository<SymbolEntity>,
  ) {}

  // 1) Биржи: пока статично
  getExchanges() {
    return [
      { code: 'binance', name: 'Binance' },
      // завтра: { code: 'bybit', name: 'Bybit' }, ...
    ];
  }

  // 2) Таймфреймы: пока возвращаем набор из конфига
  getTimeframes(_exchange?: string) {
    // если когда-то таймфреймы будут отличаться по биржам — тут можно фильтровать
    return Object.keys(INTERVAL_MS_MAP);
  }

  // 3) Символы
  async getSymbols(q: SymbolsQueryDto) {
    const where: any = {
      exchange: q.exchange,
      type: q.marketType,
    };

    // Поиск по подстроке — по имени (case-insensitive)
    if (q.q && q.q.trim().length > 0) {
      where.name = ILike(`%${q.q.trim()}%`);
    }

    const [rows, total] = await this.symbolRepo.findAndCount({
      where,
      order: { name: 'ASC' },
      take: q.limit,
      skip: q.offset,
      select: ['name'], // возвращаем только имена
    });

    return {
      items: rows.map((r) => r.name),
      total,
      limit: q.limit,
      offset: q.offset,
    };
  }
}
