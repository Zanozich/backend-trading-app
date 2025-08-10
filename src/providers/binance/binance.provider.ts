import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  BINANCE_BASE_URLS,
  BINANCE_PER_REQUEST_LIMIT,
} from 'src/config/providers/binance';
import { MarketDataProvider } from 'src/domain/market-data.provider';
import { Candle, ExchangeCode, MarketType } from 'src/domain/market.types';
import { getIntervalMs } from 'src/data-center/utils/interval-to-ms';

/**
 * Типы, специфичные для ответов Binance (оставляем локально у провайдера).
 * Если захочешь переиспользовать — можно вынести в src/providers/binance/types.ts
 */
interface BinanceSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

interface BinanceExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: BinanceSymbol[];
}

/**
 * Адаптер Binance, реализующий общий интерфейс провайдера маркет-данных.
 * Реализует обязательный метод fetchCandles, плюс даёт бинанс-специфичный getExchangeInfo.
 */
@Injectable()
export class BinanceProvider implements MarketDataProvider {
  public readonly exchange: ExchangeCode = 'binance';

  /**
   * Базовый метод общего интерфейса: чтение свечей чанками до покрытия окна.
   * Фикс для «до листинга»: пустые чанки пролистываем вперёд, не прерывая цикл.
   */
  async fetchCandles(
    type: MarketType,
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]> {
    // 1) URL и лимит Binance
    const baseUrl = BINANCE_BASE_URLS[type];
    const url = `${baseUrl}/klines`;

    const result: Candle[] = [];

    // 2) Нормализация границ
    let from = startTime;
    const maxEndTime = Math.min(endTime, Date.now());
    if (!(from < maxEndTime)) return result;

    // 3) Размер чанка по времени = длительность бара * лимит Binance (обычно 1000)
    const stepMsPerBar = getIntervalMs(interval);
    const stepMsPerChunk = stepMsPerBar * BINANCE_PER_REQUEST_LIMIT;

    // 4) Идём окнами до конца диапазона
    while (from < maxEndTime) {
      const to = Math.min(from + stepMsPerChunk, maxEndTime);

      const { data } = await axios.get(url, {
        params: {
          symbol,
          interval,
          startTime: from,
          endTime: to,
          limit: BINANCE_PER_REQUEST_LIMIT,
        },
        timeout: 15_000, // таймаут одной сетевой попытки (ретраи — на уровне оркестратора)
      });

      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          result.push({
            time: item[0], // мс UTC
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5]),
          });
        }
        // следующий чанк начинаем сразу после последней свечи, чтобы избежать дублей
        from = data[data.length - 1][0] + 1;
      } else {
        // важный фикс: если окно пустое (до листинга/нет торговли) — пролистываем дальше
        from = to + 1;
      }
    }

    return result;
  }

  /**
   * Бинанс-специфичный метод: exchangeInfo
   * Не входит в общий интерфейс MarketDataProvider (контракт у каждой биржи свой),
   * поэтому выносим его как дополнительную возможность именно этого адаптера.
   */
  async getExchangeInfo(type: MarketType): Promise<BinanceExchangeInfo> {
    const url = `${BINANCE_BASE_URLS[type]}/exchangeInfo`;
    const { data } = await axios.get<BinanceExchangeInfo>(url, {
      timeout: 10_000,
    });
    return data;
  }
}
