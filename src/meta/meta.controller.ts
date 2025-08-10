import { Controller, Get, Query, Post } from '@nestjs/common';
import { MetaService } from './meta.service';
import { CatalogSyncService } from './catalog-sync.service';
import { SymbolsQueryDto } from './dto/symbols-query.dto';
import { ExchangeCode, MarketType } from 'src/domain/market.types';

@Controller()
export class MetaController {
  constructor(
    private readonly meta: MetaService,
    private readonly sync: CatalogSyncService,
  ) {}

  // 1) Биржи
  @Get('exchanges')
  async getExchanges() {
    return this.meta.getExchanges();
  }

  // 2) Таймфреймы (пока глобальные)
  @Get('timeframes')
  async getTimeframes(
    @Query('exchange') exchange?: string, // на будущее, сейчас не используется
  ) {
    return this.meta.getTimeframes(exchange);
  }

  // 3) Символы
  @Get('symbols')
  async getSymbols(@Query() q: SymbolsQueryDto) {
    return this.meta.getSymbols(q);
  }

  // 4) (опционально) Ручной запуск синка справочника символов
  //    Например: POST /admin/catalog/sync?exchange=binance&marketType=spot
  @Post('admin/catalog/sync')
  async syncCatalog(
    @Query('exchange') exchange: ExchangeCode = 'binance',
    @Query('marketType') marketType: MarketType = 'spot',
  ) {
    const count = await this.sync.syncSymbols(exchange, marketType);
    return { ok: true, exchange, marketType, upserted: count };
  }
}
