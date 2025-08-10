import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDuplicateCandlesUniqueIndex1713000002000
  implements MigrationInterface
{
  name = 'DropDuplicateCandlesUniqueIndex1713000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_12be92ffde14d8ce4398ef69c1";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_12be92ffde14d8ce4398ef69c1"
      ON "candles" ("symbolId", "timeframeId", "timestamp");
    `);
  }
}
