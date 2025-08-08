import 'reflect-metadata';
import { Binance } from './binance';

async function main() {
  const binance = new Binance();

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  const candles = await binance.fetchCandles(
    'spot',
    'BTCUSDT',
    '1h',
    now - oneHour * 10,
    now,
  );

  console.log(`Получено ${candles.length} свечей:`);
  console.dir(candles.slice(0, 3), { depth: null }); // Показать первые 3 свечи
}

main().catch((e) => {
  console.error('Ошибка при тестировании:', e);
});
