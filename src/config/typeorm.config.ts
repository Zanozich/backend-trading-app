import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'example123', // замени на свой
  database: 'trading',
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  synchronize: true, // можно true на dev, но false на проде
});
