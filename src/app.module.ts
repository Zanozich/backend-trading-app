import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config/typeorm.config';
import { CandlesModule } from './candles/candles.module';
import { DataCenterModule } from './data-center/data-center.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    CandlesModule,
    DataCenterModule,
  ],
})
export class AppModule {}
