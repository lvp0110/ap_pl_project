# Akufon Proline / Ecophon — бланки проектов

Веб-приложение для заполнения бланка информирования Ecophon (Акустик Групп): проекты, контакты, проделанная работа, материалы. Копия бланков хранится в браузере. Справочники CRM приходят из API ConstrTodo. Прайс материалов — из Excel.

## Запуск

Нужны Node.js 20+ и npm.

```bash
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173/ap_pl_project/`.

## Публикация на GitHub Pages

Сайт: [https://lvp0110.github.io/ap_pl_project/](https://lvp0110.github.io/ap_pl_project/)

Сейчас GitHub отдаёт **корневой** `index.html` из исходников. В нём стоит `/src/main.tsx` — этого файла на Pages нет, поэтому пустой экран и 404.

Нужно публиковать папку **`docs`** (готовая сборка), а не корень репозитория.

В репозитории: **Settings → Pages → Build and deployment**

1. **Source:** Deploy from a branch (не GitHub Actions)
2. **Branch:** `main`
3. **Folder:** `/docs`
4. Save

Откройте именно `https://lvp0110.github.io/ap_pl_project/` (со слэшем в конце), лучше в режиме инкогнито.

## Скрипты

| Команда | Назначение |
|---|---|
| `npm run dev` | Локальная разработка |
| `npm run build` | Production-сборка |
| `npm run preview` | Просмотр собранного приложения |
| `npm run lint` | Проверка кода |

## Возможности

- Бланк информирования (жёлтые графы заполняет менеджер)
- Проверка обязательных полей при сохранении бланка
- Сохранение черновика без полного заполнения
- Дашборд, список проектов, справочники CRM с API
- Загрузка прайса Excel в таблицу материалов бланка

## API ConstrTodo

Swagger: `http://localhost:3005/swagger/index.html` (теги `crm references`, `crm brand managers`, `crm sg managers`).

Локально Vite проксирует `/login`, `/auth`, `/crm` на ConstrTodo (`UPSTREAM_TARGET`, по умолчанию `http://localhost:3005`). Войдите в боковой панели — справочники бренда `ecophon` (`VITE_CRM_BRAND`) загрузятся из API. Новые пункты справочников добавляются на странице «Справочники» кнопкой «Добавить в API». Прайс загружается в бланке, в таблице материалов (Excel «Прайс-лист»: наименование, стоимость, единица).

| Этап | Данные | Статус |
|---|---|---|
| 1 | `GET /crm/references/{type}`, `GET /crm/materials`, `GET /crm/sg-managers` | сделано |
| 2 | `POST /crm/references/{type}`, `POST /crm/sg-managers` | сделано |
| 3 | бланки проектов | в swagger нет `/crm/projects` |

Бланки по-прежнему живут в браузере.

## Стек

React 19, TypeScript, Vite 8, ExcelJS.
