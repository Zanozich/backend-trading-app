import { RawCandle, Candle } from './types';

/**
 * Валидирует одну свечу (одну строку из CSV).
 * Проверяет корректность структуры, значений и диапазонов.
 */
export function validateCandle(row: RawCandle): Candle | null {
  // Проверка базовой структуры строки
  if (!Array.isArray(row) || row.length < 8) {
    console.warn('Invalid row structure:', row);
    return null;
  }

  // Распаковка нужных полей по индексам
  const [timestamp, , , open, high, low, close, volume] = row;

  // Проверка корректности timestamp
  if (typeof timestamp !== 'number' || timestamp <= 0) {
    console.warn('Invalid timestamp:', timestamp);
    return null;
  }

  // Переводим в секунды и проверяем реалистичность
  const sec = Math.floor(timestamp / 1000);
  if (sec < 1262304000 || sec > 2051222400) {
    console.warn('Unrealistic timestamp (converted):', sec);
    return null;
  }

  // Проверка типа и валидности чисел OHLC и volume
  if (
    typeof open !== 'number' ||
    isNaN(open) ||
    typeof high !== 'number' ||
    isNaN(high) ||
    typeof low !== 'number' ||
    isNaN(low) ||
    typeof close !== 'number' ||
    isNaN(close) ||
    typeof volume !== 'number' ||
    isNaN(volume)
  ) {
    console.warn('Invalid OHLC or volume values:', {
      open,
      high,
      low,
      close,
      volume,
    });
    return null;
  }

  // Проверка логики значений OHLC
  if (high < Math.max(open, close) || low > Math.min(open, close)) {
    console.warn('OHLC values inconsistent (high < max(oc), low > min(oc))', {
      open,
      high,
      low,
      close,
    });
    return null;
  }

  if (low > high) {
    console.warn('Low greater than high:', { low, high });
    return null;
  }

  // Возврат валидной свечи
  return {
    time: sec,
    open,
    high,
    low,
    close,
    volume,
  };
}
