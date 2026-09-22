# Deploy ap_pl_project → crmakyfon.constrtodo.ru

Прод: **Docker Compose** на `51.250.51.86` (hostname `webtest`, Ubuntu 24.04), TLS и маршрутизация по домену — на **хостовом nginx**. Деплой — SSH из локального Makefile или из GitHub Actions. **Своего backend и БД нет**: в стеке один сервис (frontend), а auth и CRM-API живут во внешнем ConstrTodo.

Машина общая: рядом живут `ag_co_worker`, `constr-todo-web`, `hr-todo-web`, `ag_sound_calc`, `acoustic_calc`, `cad-*`. Все — в Docker, исходники в `/home/leonidl/<project>`.

## Архитектура

```
Интернет :443 / :80 (redirect)
   ↓
[host nginx]  /etc/nginx/sites-enabled/crmakyfon.conf
   └─ server_name crmakyfon.constrtodo.ru
      ssl_certificate /home/leonidl/certs/{fullchain,privkey}.pem   (wildcard *.constrtodo.ru)
      proxy_pass → 127.0.0.1:3008
   ↓
[frontend]  контейнер ap_pl_project-frontend   127.0.0.1:3008 → :3009
   ├─ express.static(/app/dist)      ← vite build внутри образа, BASE_PATH=/
   ├─ /health, /__front_health       ← отвечает сам
   └─ /login, /auth/*, /crm/*        → UPSTREAM_URL
   ↓
[внешний ConstrTodo] — auth и CRM-API
```

Наружу смотрит только nginx на 80/443, frontend опубликован на loopback.

### Порты

| Порт | Кто | Замечание |
|------|-----|-----------|
| `127.0.0.1:3008` | frontend (host) | Свободен. 3000–3007 на машине заняты соседями. |
| `3009` | frontend (в контейнере) | — |

### Состояние CRM-API

На 2026-09-18 ветка `feat/crm` ConstrTodo **не выкачена ни на один сервер**: `https://dev3.constrtodo.ru:3005/crm/...` отдаёт 404. Фронт поднимется и отрисуется, но логин/справочники/проекты заработают только после выката бэка. Адрес меняется одной строкой в `.env.prod` на сервере + `make deploy-frontend` (пересборка не нужна, но контейнер надо перезапустить).

---

## Первый запуск

### 1. Предусловия на сервере

Docker и группа `docker` на webtest уже настроены, `leonidl` в группе. Node на хосте 18 и **не участвует** — vite собирается внутри образа на Node 22. Сертификат — общий wildcard `*.constrtodo.ru` в `/home/leonidl/certs`, certbot не нужен.

### 2. nginx server block (нужен sudo с паролем)

Без него `crmakyfon.constrtodo.ru` попадает в чужой catch-all и отдаёт постороннюю страницу.

```bash
ssh leonidl@51.250.51.86
cd /home/leonidl/ap_pl_project   # после шага 3, либо скопируйте файл руками
sudo sed -e 's|<domain>|crmakyfon.constrtodo.ru|g' \
         -e 's|<cert_dir>|/home/leonidl/certs|g' \
         deploy/nginx/crmakyfon.conf \
  | sudo tee /etc/nginx/sites-available/crmakyfon.conf >/dev/null
sudo ln -sf /etc/nginx/sites-available/crmakyfon.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. `.env.prod` на сервере

```bash
ssh leonidl@51.250.51.86
git clone https://github.com/lvp0110/ap_pl_project.git /home/leonidl/ap_pl_project
cd /home/leonidl/ap_pl_project
cp deploy/.env.prod.example .env.prod
chmod 600 .env.prod
# Проверить UPSTREAM_URL.
```

`bootstrap.sh` сделает clone сам, но `.env.prod` не создаёт и не перезаписывает — файл под контролем оператора.

### 4. Локальный `.env.deploy` и bootstrap

```bash
cp deploy/.env.deploy.example deploy/.env.deploy
make deploy-bootstrap
```

`bootstrap.sh`: clone/fetch → проверка предусловий → `docker compose up -d --build` → health → smoke по домену.

---

## Регулярный деплой

| Ситуация | Команда | Что произойдёт |
|----------|---------|----------------|
| Менялся фронт | `make deploy-frontend` | `git checkout origin/main -- <пути>` → `up -d --build frontend` (vite build внутри образа) → health + smoke. |
| Откат | `REV=<sha> make deploy-frontend` | То же, но с нужной ревизией. |
| Правка nginx | `make deploy-nginx-sync && make deploy-nginx-reload` | Требует sudo. |
| Статус | `make deploy-status` | `compose ps` + ревизия + health фронта и домена. |
| Логи | `make deploy-logs` | `TAIL=500`, `FOLLOW=1`. |

---

## GitHub Actions auto-deploy (push в `main`)

[.github/workflows/prod-deploy.yml](../.github/workflows/prod-deploy.yml) дёргает те же `deploy/*.sh`.

### Триггеры

- **push в `main`** — роллаут, если менялись пути фронта; smoke всегда.
- **workflow_dispatch** — все шаги принудительно, плюс вход `rev` для отката.

О старте, успехе и падении прилетает уведомление в Telegram.

### Требуемые GitHub Secrets

`Settings → Secrets and variables → Actions → Repository secrets`:

| Секрет | Значение |
|--------|----------|
| `DEPLOY_HOST` | `leonidl@51.250.51.86` |
| `DEPLOY_DIR` | `/home/leonidl/ap_pl_project` |
| `DEPLOY_DOMAIN` | `crmakyfon.constrtodo.ru` |
| `DEPLOY_CERT_DIR` | `/home/leonidl/certs` |
| `DEPLOY_SSH_KEY` | приватный ключ `~/.ssh/crmakyfon_deploy` (полный PEM) |
| `DEPLOY_KNOWN_HOSTS` | `51.250.51.86 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDxXwEwTYlSMhk6S1PEVAjmWI/ZEYfOYKZfqOBoedgXH` |
| `TELEGRAM_BOT_TOKEN` | токен бота, который шлёт уведомления о деплое |
| `TELEGRAM_CHAT_ID` | id чата (для группы — с `-100…`) |

Переменная (не секрет), `Settings → Variables`:

| Переменная | Смысл |
|------------|-------|
| `NGINX_AUTOSYNC` | `true` — разрешить CI применять nginx-конфиг. Требует NOPASSWD-sudo. По умолчанию выключено. |

### Откат

```bash
gh workflow run prod-deploy.yml -f rev=<previous-sha>
```

---

## Диагностика

```bash
make deploy-status              # compose ps + health
make deploy-logs                # логи контейнера
FOLLOW=1 make deploy-logs

ssh leonidl@51.250.51.86 "sudo tail -f /var/log/nginx/crmakyfon.error.log"

nc -vz 51.250.51.86 3008        # ожидаем refused (только loopback)
```

Частые случаи:

- **Домен отдаёт постороннюю страницу** — не активирован nginx server block (шаг 2).
- **502 от nginx** — контейнер лежит: `make deploy-logs`.
- **Логин не работает, /crm даёт 404** — CRM-API не выкачен на `UPSTREAM_URL`.
- **Контейнер поднялся, nginx даёт 502** — в `.env.prod` появился `HOST=127.0.0.1`; внутри контейнера нужен bind на `0.0.0.0`.

## Что скрипты НЕ делают

- Не ставят и не обновляют TLS-сертификаты (wildcard живёт вне проекта).
- Не пишут `.env.prod` — он под контролем оператора.
- Не ставят nginx server block без NOPASSWD-sudo — по умолчанию это ручной шаг.
