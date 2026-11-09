import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envSchema } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { WeightsModule } from './weights/weights.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        uuidExtension: 'pgcrypto',
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    HealthModule,
    WeightsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
