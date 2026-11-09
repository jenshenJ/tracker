import { z } from 'zod';

/**
 * Схема переменных окружения.
 *
 * ConfigModule проверяет её при старте: приложение не поднимется, если
 * обязательная переменная отсутствует или имеет неверный формат.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.url(),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;
