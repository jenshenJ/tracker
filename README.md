# Путь к 95 — трекер похудения

PWA-приложение: дневник питания с AI-поиском продуктов, AI-повар под остаток КБЖУ
и график тренировок, трекер веса с плановой линией до цели, бэкап данных в JSON.

## Стек

React 18 + TypeScript + Vite + Tailwind CSS 4. AI-запросы идут через serverless-функцию
`api/ai.ts` (Vercel) — ключ Anthropic хранится на сервере и в браузер не попадает.

## Структура

```
api/ai.ts            serverless-прокси к Anthropic (ключ в env)
public/              PWA: manifest, service worker, иконки
src/
  App.tsx            корень: состояние, вкладки, навигация
  types.ts           доменные типы (Profile, DayLog, FoodEntry…)
  constants/         цели по умолчанию, база продуктов
  lib/               date, storage (localStorage), stats, ai-клиент, промпты
  components/        Bar, WeightChart, AiChef, BackupSection
  components/tabs/   TodayTab, FoodTab, WeightTab, PlanTab
```

## Деплой на Vercel

1. Запушить репозиторий на GitHub: `git push -u origin main`
2. На [vercel.com](https://vercel.com): **Add New → Project → импортировать репо `tracker`**.
   Vercel сам определит Vite — настройки менять не нужно.
3. **Settings → Environment Variables** → добавить `ANTHROPIC_API_KEY`
   (ключ с console.anthropic.com). Без него работает всё, кроме AI-поиска и AI-повара.
4. Deploy. Открыть сайт в Safari → Поделиться → «На экран "Домой"».

Дальше каждый `git push` в `main` деплоится автоматически.

## Разработка

```bash
npm install
npm run dev        # vite dev-сервер (без /api)
vercel dev         # dev-сервер вместе с serverless /api/ai
npm run build      # typecheck + прод-сборка в dist/
```

## Данные

Хранятся в localStorage устройства (ключи `t95:*`). Перенос между устройствами:
«План» → Резервная копия → Выгрузить / Восстановить.
