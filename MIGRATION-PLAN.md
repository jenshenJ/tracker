# Переезд tracker95 на клиент-серверную архитектуру

Документ описывает переход от «монолитного фронтенда» (вся логика и данные в браузере,
`localStorage` с ключами `t95:*`) к архитектуре с настоящим бэкендом: БД, аккаунты,
синхронизация устройств.

**Цели (выбраны):** надёжность данных (не теряются при чистке кэша/смене браузера, серверные
бэкапы) и аккаунты с приватностью (личные кабинеты, разделение данных пользователей).
**Авторизация:** OAuth через Google / Apple.
**Принцип:** сохранить офлайн-работу PWA — локальное хранилище остаётся кэшем, сервер становится
источником истины.

---

## 1. Где мы сейчас

| Слой | Сейчас | Куда движемся |
|------|--------|---------------|
| Данные | `localStorage`, ключи `t95:*`, по одному устройству | Postgres на сервере, привязка к `user_id` |
| Источник истины | Браузер | Сервер; localStorage → офлайн-кэш |
| Бэкап | Ручная выгрузка/загрузка JSON | Автоматический серверный + ручной экспорт остаётся |
| Аккаунты | Нет (анонимно на устройстве) | OAuth Google/Apple, личные кабинеты |
| Бэкенд | Одна функция `api/ai.ts` (прокси к LLM) | Полный набор API: данные + auth + AI |
| Деплой | Vercel (Vite SPA + serverless) | Тот же подход, добавляется БД и auth |

Существующие сущности (из `src/types.ts`), которые надо перенести:
Profile, Weights (дата→вес), DayLog (foods[] + acts[]) по датам, pantry (текст),
CustomFood (свои блюда, в т.ч. составные), WorkoutLog (тренировки с подходами),
WorkoutProgram (программы), ActiveProgram, настройка insightsDays.

---

## 2. Выбор стека

Цель уточняется в процессе — ниже сравнение трёх вариантов под наши требования
(OAuth, надёжность, сохранить Vercel + офлайн PWA).

| Критерий | **Supabase** (реком.) | Vercel + Neon | Отдельный Node-сервер |
|----------|----------------------|---------------|-----------------------|
| БД | Managed Postgres | Managed Postgres (Neon) | Свой Postgres |
| Auth (Google/Apple OAuth) | Встроено, из коробки | Писать самим / Auth.js | Писать самим / Auth.js |
| Своего кода | Минимум | Средне (API-функции) | Максимум |
| Row-Level Security (приватность) | Встроена в Postgres | Реализовать в коде | Реализовать в коде |
| Серверные бэкапы | Встроены (PITR) | Neon (branching/restore) | Настраивать самим |
| Хостинг | Supabase + Vercel (фронт) | Только Vercel | Отдельный (Fly/Railway/VPS) |
| Vendor lock-in | Средний (но это чистый PG) | Низкий | Нулевой |
| DevOps-нагрузка | Низкая | Низкая–средняя | Высокая |

**Рекомендация: Supabase.** Для наших двух целей (надёжность + аккаунты/приватность) он
закрывает три самые трудозатратные части сразу: OAuth Google/Apple, Row-Level Security для
изоляции данных пользователей, автоматические бэкапы. Фронтенд остаётся на Vercel без изменений
в деплое. Под капотом — обычный Postgres, поэтому при желании можно съехать на свой сервер позже.

Дальше схема БД и API даны в нейтральных терминах Postgres/REST — они применимы к любому
из трёх вариантов; различается только реализация auth и доступа к данным.

---

## 3. Схема БД (Postgres)

Принцип: то, что нужно фильтровать/агрегировать на сервере (продукты дня, веса, подходы) —
в нормализованных таблицах; редко меняющиеся вложенные структуры (состав блюда, слоты
программы) — в `jsonb`. Все пользовательские таблицы имеют `user_id` и защищены RLS.

```sql
-- Пользователи (если Supabase Auth — частично управляется им; здесь профиль приложения)
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  oauth_provider text not null,          -- 'google' | 'apple'
  created_at    timestamptz not null default now()
);

-- Профиль/цели — 1:1 с пользователем
create table profiles (
  user_id        uuid primary key references users(id) on delete cascade,
  goal           text not null,          -- 'cut' | 'recomp' | 'bulk'
  start_date     date not null,
  start_weight   numeric not null,
  goal_weight    numeric not null,
  goal_date      date not null,
  kcal_target    int not null,
  protein_target int not null,
  fat_target     int not null,
  carb_target    int not null,
  schedule       jsonb not null default '{}',  -- {0..6: 'gym'|'foot'|null}
  insights_days  int not null default 7,
  pantry         text not null default '',
  updated_at     timestamptz not null default now()
);

-- Вес по датам (Weights: дата → число)
create table weights (
  user_id  uuid not null references users(id) on delete cascade,
  date     date not null,
  weight   numeric not null,
  primary key (user_id, date)
);

-- Записи еды (раскрытый DayLog.foods[])
create table food_entries (
  id       bigserial primary key,
  user_id  uuid not null references users(id) on delete cascade,
  date     date not null,
  meal     text not null,                -- 'Завтрак'|'Обед'|'Перекус'|'Ужин'
  name     text not null,
  grams    numeric not null,
  kcal     numeric not null,
  p        numeric not null,
  f        numeric not null,
  c        numeric not null
);
create index on food_entries (user_id, date);

-- Активности дня (DayLog.acts[])
create table activities (
  id       bigserial primary key,
  user_id  uuid not null references users(id) on delete cascade,
  date     date not null,
  type     text not null,
  minutes  int not null
);
create index on activities (user_id, date);

-- Свои продукты/блюда (CustomFood), составные — в items jsonb
create table custom_foods (
  id       bigserial primary key,
  user_id  uuid not null references users(id) on delete cascade,
  name     text not null,
  kcal     numeric not null,
  p        numeric not null,
  f        numeric not null,
  c        numeric not null,
  portion  numeric,
  items    jsonb,                         -- [{name,grams,kcal,p,f,c}] | null
  created_at timestamptz not null default now()
);
create index on custom_foods (user_id);

-- Общая база продуктов сообщества (см. раздел 3.1)
create table shared_foods (
  id          bigserial primary key,
  name        text not null,
  kcal        numeric not null,
  p           numeric not null,
  f           numeric not null,
  c           numeric not null,
  portion     numeric,
  added_by    uuid references users(id) on delete set null,  -- кто предложил
  approved    boolean not null default false,                -- модерация
  usage_count int not null default 0,                        -- популярность
  created_at  timestamptz not null default now()
);
create index on shared_foods (name);

-- Программы тренировок (WorkoutProgram); дни/слоты — jsonb
create table programs (
  id          text primary key,          -- сохраняем строковые id (вкл. встроенные)
  user_id     uuid references users(id) on delete cascade,  -- null = встроенная/общая
  name        text not null,
  description text,
  weeks       int not null,
  days        jsonb not null,            -- ProgramDay[] со слотами
  builtin     boolean not null default false
);

-- Активная программа пользователя (ActiveProgram)
create table active_program (
  user_id    uuid primary key references users(id) on delete cascade,
  program_id text not null,
  anchor     date not null               -- понедельник первой недели цикла
);

-- Логи тренировок (WorkoutLog); подходы вынесены отдельно
create table workouts (
  id           text primary key,         -- сохраняем существующий id тренировки
  user_id      uuid not null references users(id) on delete cascade,
  date         date not null,
  week         int not null,
  weekday      int not null,
  started_at   timestamptz not null,
  finished_at  timestamptz,
  slots        jsonb                      -- слепок плана сессии (ProgramSlot[])
);
create index on workouts (user_id, date);

-- Упражнения внутри тренировки (WorkoutExerciseLog) + подходы
create table workout_exercises (
  id           bigserial primary key,
  workout_id   text not null references workouts(id) on delete cascade,
  exercise_id  text not null,
  skipped      boolean not null default false,
  position     int not null,
  sets         jsonb not null default '[]'  -- [{weight,reps,seconds?}]
);
create index on workout_exercises (workout_id);
```

### 3.1 Общая база продуктов

Поиск продукта идёт по трём источникам: встроенная база (`foodDb.ts`) → общая (`shared_foods`)
→ личные (`custom_foods`). Личные и общие в выдаче помечаются по-разному.

Продуктовые решения (заложены значения по умолчанию, легко поменять):
- **Шаринг только явный.** Личные блюда не уходят в общую базу автоматически — там личное
  («мамин борщ»). В общую попадают по кнопке «Поделиться с сообществом».
- **Качество.** Чтобы база не превратилась в свалку дублей: новые записи приходят как
  `approved = false`, всплывают по `usage_count`; модерация (подтверждение) опциональна и
  нужна, только если приложение открыто публично. Для узкого круга достаточно дедупликации по имени.
- Развилку «узкий круг ↔ публично» окончательно выбираем перед реализацией этого блока.

Замечания:
- `workouts.id` и `programs.id` — строковые, чтобы перенести существующие id без коллизий
  и не сломать «чётность» циклов (anchor-логику).
- Подходы (`sets`) оставлены в `jsonb` внутри `workout_exercises`: их почти всегда читают
  и пишут целиком вместе с упражнением, отдельная таблица подходов избыточна.
- Каждая таблица + RLS-политика вида `user_id = auth.uid()` (в Supabase) либо проверка
  `user_id` в каждом запросе (в своём API). Встроенные программы (`user_id is null`) — read-only для всех.

---

## 4. REST API

База `/api`. Авторизация — Bearer-токен сессии (в Supabase — JWT из auth). Все ответы JSON.
Каждый защищённый эндпоинт работает только с данными текущего пользователя.

**Auth (OAuth Google/Apple)**
```
GET  /api/auth/login?provider=google|apple   → редирект на провайдера
GET  /api/auth/callback                       → обмен кода на сессию, set-cookie/JWT
POST /api/auth/logout                         → завершить сессию
GET  /api/auth/me                             → текущий пользователь
```

**Профиль и настройки**
```
GET  /api/profile                 → Profile + insights_days + pantry
PUT  /api/profile                 → создать/обновить (upsert)
```

**Дни (еда + активности)**
```
GET    /api/days?from=YYYY-MM-DD&to=YYYY-MM-DD   → DayLog по диапазону (для сводок)
GET    /api/days/:date                            → один день
POST   /api/days/:date/foods                      → добавить запись еды
PUT    /api/days/:date/foods/:id                  → изменить
DELETE /api/days/:date/foods/:id
POST   /api/days/:date/activities                 → добавить активность
DELETE /api/days/:date/activities/:id
```

**Вес**
```
GET    /api/weights?from=&to=     → веса по диапазону
PUT    /api/weights/:date         → задать вес на дату (upsert)
DELETE /api/weights/:date
```

**Свои продукты**
```
GET    /api/custom-foods
POST   /api/custom-foods
PUT    /api/custom-foods/:id
DELETE /api/custom-foods/:id
```

**Общая база продуктов**
```
GET    /api/shared-foods?q=        → поиск по общей базе (по имени, сортировка по usage_count)
POST   /api/shared-foods           → предложить продукт («поделиться»); создаётся approved=false
POST   /api/shared-foods/:id/use   → инкремент usage_count при добавлении в дневник
```

**Тренировки**
```
GET    /api/workouts?from=&to=    → логи тренировок (с упражнениями и подходами)
GET    /api/workouts/:id
POST   /api/workouts              → начать тренировку (вернёт id)
PUT    /api/workouts/:id          → обновить (подходы, finished_at, slots)
DELETE /api/workouts/:id
```

**Программы**
```
GET    /api/programs              → встроенные + свои
POST   /api/programs              → создать свою
PUT    /api/programs/:id
DELETE /api/programs/:id
GET    /api/active-program
PUT    /api/active-program        → {program_id, anchor}
```

**Бэкап / импорт** (совместимость с текущим JSON-форматом `BackupFile`)
```
GET    /api/backup                → весь профиль одним JSON (как сейчас «Выгрузить»)
POST   /api/import                → загрузить BackupFile, перезаписать данные пользователя
```

**AI (уже есть, переносится почти без изменений)**
```
POST   /api/ai                    → прокси к LLM; добавить привязку к user_id и rate-limit
```

---

## 5. Стратегия миграции (поэтапно)

Ключевая идея: **localStorage остаётся, но становится кэшем**, а не источником истины.
Это сохраняет офлайн-работу PWA и позволяет переезжать без даунтайма и потери данных.

### Этап 0 — подготовка (бэкенд-каркас)
- Завести проект (Supabase или выбранный), накатить схему из раздела 3.
- Настроить OAuth Google/Apple, выдачу сессии, RLS/проверки доступа.
- Перенести `api/ai.ts` на тот же бэкенд, добавить привязку к пользователю и rate-limit.
- Деплой: бэкенд + текущий фронт работают параллельно, фронт пока на localStorage.

### Этап 1 — слой доступа к данным на фронте
- Ввести абстракцию репозитория поверх текущего `src/lib/storage.ts`
  (тот же интерфейс: `loadProfile`, `saveDay`, …), но с двумя реализациями:
  `LocalStore` (как сейчас) и `ApiStore` (через REST).
- Это изолирует все вызовы хранилища — компоненты не трогаем.

### Этап 2 — аккаунты
- Добавить экран входа (Google/Apple). До входа — анонимный локальный режим (как сейчас).
- После первого входа — предложить «перенести данные с устройства» (см. этап 3).

### Этап 3 — миграция существующих данных
- Кнопка/автоматический шаг «Перенести данные в аккаунт»: фронт собирает текущий
  `localStorage` в формат `BackupFile` (логика уже есть в «Резервная копия») и шлёт `POST /api/import`.
- Сервер делает upsert, сохраняя строковые id тренировок/программ и anchor — чётность циклов не ломается.
- После успеха — `ApiStore` становится основным; localStorage переключается в режим кэша.

### Этап 4 — офлайн-синхронизация
- Запись: оптимистично в локальный кэш + очередь на отправку; при сети — досылается на сервер.
- Чтение: сначала кэш (мгновенный UI), затем фоновое обновление с сервера.
- Разрешение конфликтов: last-write-wins по `updated_at` (для дневника достаточно;
  записи еды/подходы по своим id почти не конфликтуют).
- Service worker уже есть (PWA) — расширить под фоновую синхронизацию.

### Этап 5 — выключение монолита
- Серверные автобэкапы включены, данные пользователей изолированы (RLS проверена).
- Ручной экспорт/импорт JSON оставляем как функцию (полезно и удобно), но это больше не
  единственный способ переноса.
- Документация (README) обновляется: новый стек, переменные окружения, OAuth-настройки.

---

## 6. Риски и как их закрыть

| Риск | Митигация |
|------|-----------|
| Потеря данных при миграции с устройства | Миграция через существующий `BackupFile`; импорт идемпотентен (upsert по id); экспорт JSON остаётся |
| Сломанная «чётность» циклов тренировок | Переносим строковые id и `anchor` как есть, не пересоздаём |
| Офлайн-сценарии PWA | localStorage → кэш + очередь записи; чтение cache-first |
| Конфликты при синхронизации | last-write-wins по `updated_at`; гранулярные id для еды/подходов снижают пересечения |
| Утечка между пользователями | RLS на каждой таблице (`user_id = auth.uid()`) или проверка user_id в каждом запросе; покрыть тестами |
| Ключ AI и злоупотребление | Прокси остаётся серверным; добавить rate-limit и привязку к user_id |
| Vendor lock-in | Под капотом чистый Postgres — схема переносима на свой сервер |

---

## 7. Чеклист первого спринта

- [ ] Выбрать стек окончательно (рекомендация — Supabase) и завести проект
- [ ] Накатить схему БД (раздел 3) + RLS-политики
- [ ] Настроить OAuth Google/Apple, выдачу сессии
- [ ] Перенести `api/ai.ts`, добавить rate-limit + user_id
- [ ] Ввести репозиторий-абстракцию (`LocalStore` / `ApiStore`) поверх `storage.ts`
- [ ] Реализовать `GET/PUT /api/profile` и `GET /api/days/:date` как первый вертикальный срез
- [ ] Экран входа + анонимный режим до входа
- [ ] `POST /api/import` + кнопка «Перенести данные в аккаунт»
- [ ] Тесты на изоляцию данных пользователей
```
