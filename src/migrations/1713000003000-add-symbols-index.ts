import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSymbolsIndex1713000003000 implements MigrationInterface {
  name = 'AddSymbolsIndex1713000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_symbols_exchange_type_name
      ON symbols ("exchange", "type", "name");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_symbols_exchange_type_name;
    `);
  }
}
