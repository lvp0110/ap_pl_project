#!/usr/bin/env bash
# Первый запуск на сервере: clone + docker compose up --build.
#
# Предусловия на сервере (один раз, вручную):
#   1. Docker + compose plugin, deploy-пользователь в группе docker.
#   2. nginx server block из deploy/nginx/crmakyfon.conf (нужен sudo).
#   3. TLS: общий wildcard *.constrtodo.ru в /home/leonidl/certs.
#   4. $DEPLOY_DIR/.env.prod (из deploy/.env.prod.example, chmod 600).
#
# Использование:
#   make deploy-bootstrap
#   REV=origin/<branch> make deploy-bootstrap
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

REV="${REV:-$DEPLOY_REV}"

REPO_URL="${REPO_URL:-}"
if [ -z "$REPO_URL" ]; then
  REPO_URL="$(git -C "$REPO_ROOT" remote get-url "$DEPLOY_REMOTE" 2>/dev/null || true)"
fi
[ -n "$REPO_URL" ] || fail "Не удалось определить URL репозитория (задайте REPO_URL=...)"

info "checkout репо на сервер: $REPO_URL → $DEPLOY_DIR"
ssh_exec "
  set -e
  if [ ! -d '$DEPLOY_DIR/.git' ]; then
    mkdir -p '$(dirname "$DEPLOY_DIR")'
    git clone '$REPO_URL' '$DEPLOY_DIR'
  else
    cd '$DEPLOY_DIR' && git fetch --all
  fi
  cd '$DEPLOY_DIR' && git checkout '$REV'
"
ok "репо на сервере"

info "проверка предусловий на сервере"
remote '
  test -f .env.prod || {
    echo "✗ .env.prod нет в корне checkout'"'"'а."
    echo "  На сервере: cp deploy/.env.prod.example .env.prod && chmod 600 .env.prod"
    echo "  Затем заполнить UPSTREAM_URL (адрес ConstrTodo)."
    exit 1
  }
  command -v docker >/dev/null 2>&1 || { echo "✗ docker не установлен"; exit 1; }
  docker compose version >/dev/null 2>&1 || { echo "✗ docker compose plugin не установлен"; exit 1; }
  docker info >/dev/null 2>&1 || { echo "✗ нет доступа к docker без sudo"; exit 1; }
  command -v nginx >/dev/null 2>&1 || { echo "✗ nginx не установлен"; exit 1; }
'
ok "предусловия выполнены"

if remote "test -e /etc/nginx/sites-enabled/crmakyfon.conf"; then
  ok "nginx server block активирован"
else
  warn "/etc/nginx/sites-enabled/crmakyfon.conf НЕ активирован."
  warn "Домен будет попадать в чужой catch-all. См. deploy/README.md."
fi

info "сборка и запуск контейнера"
dc "up -d --build"
mark_deployed "$REV"

info "ждём health"
wait_health 40 || true

info "статус:"
dc "ps"

if [ -n "$DEPLOY_DOMAIN" ]; then
  info "smoke https://$DEPLOY_DOMAIN/health"
  curl -fsS --retry 5 --retry-delay 2 -o /dev/null -w "  HTTP %{http_code}\n" "https://$DEPLOY_DOMAIN/health" \
    || warn "через домен не отвечает — проверьте nginx server block и make deploy-logs"
fi

ok "bootstrap завершён"
