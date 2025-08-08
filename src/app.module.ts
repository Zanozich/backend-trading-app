import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config/typeorm.config';
import { CandlesModule } from './candles/candles.module';

@Module({
  imports: [TypeOrmModule.forRoot(AppDataSource.options), CandlesModule],
})
export class AppModule {}
