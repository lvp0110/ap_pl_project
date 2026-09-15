# Akufon Proline / Ecophon — бланки проектов

Веб-приложение для заполнения бланка информирования Ecophon (Акустик Групп): проекты, контакты, проделанная работа, материалы. Копия всегда есть в браузере; общую папку (сеть, Google Drive, Яндекс.Диск, SharePoint) можно подключить в Chrome или Edge.

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

- Бланк информирования по полям Excel (жёлтые графы заполняет менеджер)
- Проверка обязательных полей при сохранении бланка
- Сохранение черновика без полного заполнения
- Дашборд, список проектов, справочники из листа «Списки»
- Выгрузка реестра в Excel и загрузка заполненного бланка
- Общая папка: JSON-файлы бланков (`blank-*.json`), `catalogs.json`, снимок `registry.xlsx`

## Общая папка

Браузер не пишет на диск сам по себе. В Chrome или Edge нажмите **Выбрать папку** и укажите каталог, который уже синхронизируется:

- сетевой диск / общая папка Windows
- Google Drive для компьютера
- Яндекс.Диск
- SharePoint / OneDrive

В папке появляются файлы `blank-{id}.json` (источник правды), `catalogs.json` и `registry.xlsx`. Один бланк — один файл: два менеджера могут править **разные** проекты без конфликта. Один и тот же бланк вдвоём лучше не открывать: при сохранении приложение покажет, чья версия в папке новее.

Safari и Firefox папку не пишут — используйте **Скачать JSON** / **Загрузить JSON** или Excel.

## API ConstrTodo (этап 1)

Swagger: `http://localhost:3005/swagger/index.html` (теги `crm references`, `crm brand managers`, `crm sg managers`).

Локально Vite проксирует `/login`, `/auth`, `/crm` на ConstrTodo (`UPSTREAM_TARGET`, по умолчанию `http://localhost:3005`). Войдите в боковой панели — подтянутся справочники и материалы бренда `ecophon` (`VITE_CRM_BRAND`).

| Этап | Данные | Статус |
|---|---|---|
| 1 | `GET /crm/references/{type}`, `GET /crm/materials`, `GET /crm/sg-managers` | сделано |
| 2 | запись справочников и материалов через API | позже |
| 3 | бланки проектов | в swagger нет `/crm/projects` |

Бланки по-прежнему живут в браузере и общей папке.

## Стек

React 19, TypeScript, Vite 8, ExcelJS.
