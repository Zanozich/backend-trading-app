// src/providers/binance/binance.ts

import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { Candle } from 'src/data-center/types';

const SPOT_BASE_URL = 'https://api.binance.com/api/v3';
const FUTURES_BASE_URL = 'https://fapi.binance.com/fapi/v1';

export type MarketType = 'spot' | 'futures';

export interface BinanceSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

export interface BinanceExchangeInfo {
  timezone: string;
  serverTime: number;
  symbols: BinanceSymbol[];
}

@Injectable()
export class Binance {
  async getExchangeInfo(type: MarketType): Promise<BinanceExchangeInfo> {
    const url =
      type === 'spot'
        ? `${SPOT_BASE_URL}/exchangeInfo`
        : `${FUTURES_BASE_URL}/exchangeInfo`;

    const { data } = await axios.get<BinanceExchangeInfo>(url);
    return data;
  }

  async fetchCandles(
    type: MarketType,
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]> {
    const baseUrl = type === 'spot' ? SPOT_BASE_URL : FUTURES_BASE_URL;
    const url = `${baseUrl}/klines`;

    const limit = 1000;
    const result: Candle[] = [];

    let from = startTime;

    while (from < endTime) {
      const to = Math.min(
        from + this._calculateStepMs(interval, limit),
        endTime,
      );

      const { data } = await axios.get(url, {
        params: {
          symbol,
          interval,
          startTime: from,
          endTime: to,
          limit,
        },
      });

      if (data.length === 0) break;

      for (const item of data) {
        result.push({
          time: Math.floor(item[0] / 1000), // Binance возвращает миллисекунды
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
        });
      }

      from = data[data.length - 1][0] + 1; // следующий запрос начинается после последней свечи
    }

    return result;
  }

  /**
   * Возвращает шаг в миллисекундах для одного свечного чанка
   */
  private _calculateStepMs(interval: string, limit: number): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1), 10);

    const msMap: Record<string, number> = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    const multiplier = msMap[unit];

    if (!multiplier) {
      throw new Error(`Unsupported interval: ${interval}`);
    }

    return value * multiplier * limit;
  }
}
