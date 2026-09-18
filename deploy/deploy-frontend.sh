#!/usr/bin/env bash
# Роллаут фронта: vite build происходит НА СЕРВЕРЕ внутри образа.
#
# Использование:
#   make deploy-frontend
#   REV=<commit|tag> make deploy-frontend
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

REV="${REV:-$DEPLOY_REV}"
info "rollout frontend на $DEPLOY_HOST: rev=$REV"

remote "git fetch '$DEPLOY_REMOTE' && git checkout '$REV' -- src/ public/ index.html package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts server.js Dockerfile docker-compose.prod.yml"

info "build + up frontend"
dc "up -d --build frontend"

mark_deployed "$REV"

info "ждём health"
wait_health 40 || warn "frontend не поднялся — смотрите make deploy-logs"

info "последние 40 строк логов:"
dc "logs --tail 40 --no-log-prefix frontend" || true

if [ -n "$DEPLOY_DOMAIN" ]; then
  info "smoke https://$DEPLOY_DOMAIN/"
  curl -fsS -o /dev/null --retry 3 --retry-delay 2 -w "  HTTP %{http_code}\n" "https://$DEPLOY_DOMAIN/" \
    && ok "фронт отвечает через домен" \
    || warn "через домен не отвечает — проверьте nginx server block"
fi

ok "frontend выкачен"
