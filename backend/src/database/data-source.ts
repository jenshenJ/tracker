import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Weight } from '../weights/entities/weight.entity.js';
import { CreateUsersAndWeights1794300000000 } from './migrations/1794300000000-CreateUsersAndWeights.js';

try {
  process.loadEnvFile();
} catch {
  // .env может отсутствовать в CI или production — там переменные приходят извне.
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан');
}

/**
 * Отдельный DataSource для CLI TypeORM.
 * Приложение использует TypeOrmModule в app.module.ts.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Weight],
  migrations: [CreateUsersAndWeights1794300000000],
  synchronize: false,
  uuidExtension: 'pgcrypto',
  logging: true,
});
