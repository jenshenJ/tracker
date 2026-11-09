# legko API

Бэкенд для tracker95 на NestJS + PostgreSQL + TypeORM.

Подробный план развития: [`../NESTJS-PLAN.md`](../NESTJS-PLAN.md).

## Требования

- Node.js 24+
- Docker (для локального PostgreSQL)

## Быстрый старт

```bash
# 1. Зависимости
npm install

# 2. Переменные окружения
cp .env.example .env

# 3. PostgreSQL в Docker
docker compose up -d

# 4. Запуск с watch-режимом
npm run start:dev
```

Сервис будет доступен на `http://localhost:3001`.

- Health-check: `http://localhost:3001/api/v1/health`
- Swagger UI: `http://localhost:3001/api/docs`
- OpenAPI JSON: `http://localhost:3001/api/docs-json`

## Скрипты

```bash
npm run start:dev    # разработка с перезагрузкой
npm run build        # сборка в dist/
npm run start:prod   # запуск собранного приложения
npm run lint         # oxlint
npm run format       # prettier
npm run test         # unit-тесты (Vitest)
npm run test:e2e     # e2e-тесты (Vitest, нужна запущенная БД)
npm run migration:run    # применить миграции
npm run migration:show   # показать статус миграций
npm run migration:revert # откатить последнюю миграцию
```

> На Windows с Application Control нативный бинарник rolldown может быть заблокирован.
> Поэтому в devDependencies есть WASI-фолбэк `@rolldown/binding-wasm32-wasi`: Vitest
> автоматически использует его, если нативный модуль не загрузился.

## Переменные окружения

| Переменная | Обязательна | По умолчанию | Назначение |
|------------|-------------|--------------|------------|
| `NODE_ENV` | нет | `development` | `development` / `test` / `production` |
| `PORT` | нет | `3001` | Порт HTTP-сервера |
| `DATABASE_URL` | да | — | Строка подключения к PostgreSQL |
| `FRONTEND_URL` | нет | `http://localhost:5173` | Origin фронтенда для CORS |

Схема проверяется Zod при старте (`src/config/env.validation.ts`). Если переменной нет
или она неверного формата, приложение не запустится и покажет ошибку.

## Структура

```text
src/
  main.ts                 # bootstrap
  app.setup.ts            # общая настройка HTTP для main.ts и e2e
  app.module.ts           # ConfigModule + TypeORM + модули
  config/
    env.validation.ts     # Zod-схема env
  common/
    auth/
      auth-user.ts        # тип пользователя в request.user
      current-user.decorator.ts
      dev-user.guard.ts   # временная замена JWT
  users/
    entities/user.entity.ts
    users.module.ts
    users.service.ts      # создаёт dev-пользователя локально
  weights/
    dto/weights.dto.ts    # Zod-схемы + inferred-типы
    entities/weight.entity.ts
    weights.controller.ts # только HTTP
    weights.module.ts
    weights.service.ts    # бизнес-логика и TypeORM
  health/
    health.module.ts
    health.controller.ts  # GET /api/v1/health
  database/
    data-source.ts        # DataSource для CLI миграций
    migrations/
```

## Пример модуля: weights

Это вертикальный срез, по которому удобно делать остальные домены.

```text
HTTP-запрос
  → WeightsController   маршрут, параметры, вызов сервиса
  → WeightsService      правила и запросы к БД
  → Repository<Weight>  TypeORM
  → PostgreSQL
```

Файлы и их роли:

| Файл | Зачем |
|------|-------|
| `weights.module.ts` | собирает контроллер, сервис и репозиторий |
| `weights.controller.ts` | принимает HTTP, валидирует вход, не содержит SQL |
| `weights.service.ts` | бизнес-логика, всегда фильтрует по `userId` |
| `dto/weights.dto.ts` | Zod-схемы; из них выводятся TypeScript-типы |
| `entities/weight.entity.ts` | описание таблицы `weights` для TypeORM |
| `weights.service.spec.ts` | unit-тест сервиса с мок-репозиторием |
| `test/app.e2e-spec.ts` | проверка реального HTTP + БД |

Эндпоинты:

```text
GET    /api/v1/weights?from=2026-11-01&to=2026-11-30
PUT    /api/v1/weights/2026-11-09        { "weight": 81.2 }
DELETE /api/v1/weights/2026-11-09
```

`PUT` — идемпотентный upsert по паре `(user_id, date)`. `DELETE` тоже идемпотентен:
удаление несуществующей записи возвращает `204`, а не `404`.

Пока нет авторизации, `DevUserGuard` подставляет фиксированного пользователя из
`common/auth/dev-user.ts`. В production guard отказывает. Когда появится Google OAuth +
JWT, guard заменится на `JwtAuthGuard`, а `@CurrentUser()` и сервисы останутся прежними.

## Миграции

Схема БД меняется только миграциями, `synchronize` выключен.

```bash
# после изменения entity
npm run migration:run
```

Миграции лежат в `src/database/migrations/`. Они компилируются в `dist/`, поэтому
CLI запускается по собранному `data-source.js`. Если миграция написана вручную, как
`CreateUsersAndWeights`, просто добавьте её в массив `migrations` в `data-source.ts`.

## База данных

Локально используется PostgreSQL 16 из `docker-compose.yml`:

- user: `legko`
- password: `legko`
- database: `legko`
- port: `5432`
- volume: `pgdata`

Остановить БД:

```bash
docker compose down
```

Удалить данные вместе с volume:

```bash
docker compose down -v
```

В `backend/` есть `Dockerfile` для production-сборки:

```bash
docker build -t legko-api .
docker run --env-file .env -p 3001:3001 legko-api
```

## Правила

- `synchronize: false` — схема меняется только миграциями.
- Все относительные импорты заканчиваются на `.js` (ESM).
- Пользовательские таблицы фильтруются по `userId` в сервисах.
- Секреты и `.env` в репозиторий не коммитятся.
