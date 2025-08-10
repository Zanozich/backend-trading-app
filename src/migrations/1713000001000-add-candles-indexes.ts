import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCandlesIndexes1713000001000 implements MigrationInterface {
  name = 'AddCandlesIndexes1713000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Индекс под частый паттерн: "последние N свечей" (ORDER BY timestamp DESC LIMIT N)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_candles_symbol_timeframe_ts_desc
      ON candles ("symbolId", "timeframeId", "timestamp" DESC);
    `);

    // Опционально: ASC-индекс обычно не нужен, т.к. уникальный индекс уже покрывает скан по возрастанию
    // Оставляю коммент — на будущее.
    // await queryRunner.query(`
    //   CREATE INDEX IF NOT EXISTS idx_candles_symbol_timeframe_ts_asc
    //   ON candles ("symbolId", "timeframeId", "timestamp" ASC);
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_candles_symbol_timeframe_ts_desc;
    `);

    // await queryRunner.query(`
    //   DROP INDEX IF EXISTS idx_candles_symbol_timeframe_ts_asc;
    // `);
  }
}
