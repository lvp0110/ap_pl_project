#!/usr/bin/env bash
# Состояние прод-стека: контейнер + health изнутри и через домен.
#
# Используется как smoke-тест в CI, поэтому падает (exit 1), если приложение
# не отвечает. Проверка по домену — предупреждение: пока nginx server block не
# активирован, домен уходит в чужой catch-all и отдаёт постороннюю страницу.
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

FAILED=0

info "compose ps:"
dc "ps" || { warn "docker compose ps не выполнился (был ли bootstrap?)"; FAILED=1; }

info "выкаченная ревизия (sha / когда / коммит):"
show_deployed

info "HEAD чекаута (двигается только при bootstrap):"
remote "git log -1 --format='  %h %s (%ci)'" || warn "не удалось прочитать HEAD"

info "host-порт фронта ($FRONTEND_HOST_PORT):"
ssh_exec "ss -ltn | grep ':$FRONTEND_HOST_PORT ' || echo 'НЕ слушается'" || true

info "frontend /__front_health (127.0.0.1:$FRONTEND_HOST_PORT):"
if ssh_exec "curl -fsS --max-time 10 -w ' HTTP %{http_code}\n' http://127.0.0.1:$FRONTEND_HOST_PORT/__front_health"; then
  ok "frontend жив"
else
  warn "frontend НЕ отвечает"
  FAILED=1
fi

if [ -n "$DEPLOY_DOMAIN" ]; then
  info "health через домен: https://$DEPLOY_DOMAIN/health"
  BODY="$(curl -fsS --max-time 15 "https://$DEPLOY_DOMAIN/health" 2>/dev/null || true)"
  if printf '%s' "$BODY" | grep -q '"ok"'; then
    ok "домен отдаёт наш /health"
  elif [ -z "$BODY" ]; then
    warn "домен не ответил"
  else
    warn "домен отвечает НЕ нашим приложением (nginx server block не активирован?)"
    printf '  первые 80 символов: %s\n' "$(printf '%s' "$BODY" | head -c 80 | tr -d '\n')"
  fi
fi

if [ "$FAILED" != "0" ]; then
  fail "прод-стек не в порядке (логи — make deploy-logs)"
fi
ok "прод-стек в порядке"
