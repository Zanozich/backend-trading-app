import { RawCandle, Candle } from './types';

export function validateCandle(row: RawCandle): Candle | null {
  if (!Array.isArray(row) || row.length < 7) {
    console.warn('Invalid row structure:', row);
    return null;
  }

  const [timestamp, , , open, high, low, close] = row;

  if (typeof timestamp !== 'number' || timestamp <= 0) {
    console.warn('Invalid timestamp:', timestamp);
    return null;
  }

  // timestamp sanity check: must be after 2010 and before 2035
  const sec = Math.floor(timestamp / 1000);
  if (sec < 1262304000 || sec > 2051222400) {
    console.warn('Unrealistic timestamp (converted):', sec);
    return null;
  }

  if (
    typeof open !== 'number' ||
    isNaN(open) ||
    typeof high !== 'number' ||
    isNaN(high) ||
    typeof low !== 'number' ||
    isNaN(low) ||
    typeof close !== 'number' ||
    isNaN(close)
  ) {
    console.warn('Invalid OHLC values:', { open, high, low, close });
    return null;
  }

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

  return { time: sec, open, high, low, close };
}
