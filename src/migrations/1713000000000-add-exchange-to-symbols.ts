import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExchangeToSymbols1713000000000 implements MigrationInterface {
  name = 'AddExchangeToSymbols1713000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Добавляем колонку exchange с дефолтом 'binance' (если её нет)
    await queryRunner.query(`
      ALTER TABLE "symbols"
      ADD COLUMN IF NOT EXISTS "exchange" varchar NOT NULL DEFAULT 'binance';
    `);

    // 2) Снимаем старую уникальность на (name,type), если она была
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'symbols'::regclass
            AND contype = 'u'
            AND conname = 'UQ_symbols_name_type'
        ) THEN
          ALTER TABLE "symbols" DROP CONSTRAINT "UQ_symbols_name_type";
        END IF;
      END $$;
    `);

    // 3) Создаём новую уникальность на (name,type,exchange), если её нет
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'symbols'::regclass
            AND contype = 'u'
            AND conname = 'UQ_symbols_name_type_exchange'
        ) THEN
          ALTER TABLE "symbols"
          ADD CONSTRAINT "UQ_symbols_name_type_exchange"
          UNIQUE ("name","type","exchange");
        END IF;
      END $$;
    `);

    // 4) Убираем DEFAULT, чтобы новые строки создавались только с явным exchange
    await queryRunner.query(`
      ALTER TABLE "symbols" ALTER COLUMN "exchange" DROP DEFAULT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Откат: снимаем новую уникальность, удаляем колонку exchange, возвращаем старую уникальность (опционально)
    await queryRunner.query(`
      ALTER TABLE "symbols"
      DROP CONSTRAINT IF EXISTS "UQ_symbols_name_type_exchange";
    `);

    await queryRunner.query(`
      ALTER TABLE "symbols"
      DROP COLUMN IF EXISTS "exchange";
    `);

    // Возвращаем старую уникальность на (name,type), если её нет
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'symbols'::regclass
            AND contype = 'u'
            AND conname = 'UQ_symbols_name_type'
        ) THEN
          ALTER TABLE "symbols"
          ADD CONSTRAINT "UQ_symbols_name_type"
          UNIQUE ("name","type");
        END IF;
      END $$;
    `);
  }
}
