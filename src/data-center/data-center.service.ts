import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandleEntity } from '../entities/candle.entity';
import { SymbolEntity } from '../entities/symbol.entity';
import { TimeframeEntity } from '../entities/timeframe.entity';
import { validateCandle } from './validate-candle';

@Injectable()
export class DataCenterService {
  private readonly filePath = path.join(
    __dirname,
    '..',
    '..',
    'data',
    'Binance_BTCUSDT_1h.csv',
  );

  constructor(
    @InjectRepository(SymbolEntity)
    private readonly symbolRepo: Repository<SymbolEntity>,
    @InjectRepository(TimeframeEntity)
    private readonly timeframeRepo: Repository<TimeframeEntity>,
    @InjectRepository(CandleEntity)
    private readonly candleRepo: Repository<CandleEntity>,
  ) {}

  async importCandlesFromCsv(): Promise<void> {
    const fileStream = fs.createReadStream(this.filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    const symbolName = 'BTCUSDT';
    const timeframeName = '1h';

    // Найти или создать символ
    let symbol = await this.symbolRepo.findOne({ where: { name: symbolName } });
    if (!symbol) {
      symbol = this.symbolRepo.create({ name: symbolName });
      await this.symbolRepo.save(symbol);
    }

    // Найти или создать таймфрейм
    let timeframe = await this.timeframeRepo.findOne({
      where: { name: timeframeName },
    });
    if (!timeframe) {
      timeframe = this.timeframeRepo.create({ name: timeframeName });
      await this.timeframeRepo.save(timeframe);
    }

    const candles: CandleEntity[] = [];

    for await (const line of rl) {
      if (!line.trim()) continue;

      const parts = line.split(',');
      const numericParts = parts.map((p, i) =>
        i === 1 || i === 2 ? p : Number(p),
      );

      const validated = validateCandle(numericParts as any);
      if (!validated) continue;

      const candle = this.candleRepo.create({
        timestamp: validated.time,
        open: validated.open,
        high: validated.high,
        low: validated.low,
        close: validated.close,
        volume: validated.volume,
        symbol,
        timeframe,
      });

      candles.push(candle);
    }

    await this.candleRepo.save(candles);
    console.log(`✅ Imported ${candles.length} candles into DB`);
  }
}
