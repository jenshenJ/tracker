# Путь к 95 — трекер похудения

PWA-приложение: дневник питания с AI-поиском продуктов, AI-повар под остаток КБЖУ
и график тренировок, трекер веса с плановой линией до цели, бэкап данных в JSON.

## Деплой (GitHub Pages)

1. `git push -u origin main`
2. На GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main`, папка `/docs` → Save**
3. Через пару минут сайт доступен на `https://jenshenj.github.io/tracker/`
4. Открыть в Safari → Поделиться → «На экран "Домой"»

## AI-функции

Вкладка «План» → вставить API-ключ Anthropic (console.anthropic.com).
Ключ хранится только в localStorage устройства.

## Разработка

```bash
npm install
# правки в src/app.jsx, затем:
npm run build        # пересобирает docs/app.js
git add -A && git commit -m "update" && git push
```

Готовая сборка лежит в `docs/` — GitHub Pages раздаёт её как есть.

## Данные

localStorage устройства (ключи `t95:*`). Перенос между устройствами:
«План» → Резервная копия → Выгрузить / Восстановить.
