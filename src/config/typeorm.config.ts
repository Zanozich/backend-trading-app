import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config(); // Подгружает .env

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
});
