#!/usr/bin/env bash
# Логи прод-контейнера.
#
#   make deploy-logs                # последние 100 строк
#   TAIL=500 make deploy-logs       # больше строк
#   FOLLOW=1 make deploy-logs       # follow (Ctrl-C для выхода)
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

SERVICE="${SERVICE:-}"
TAIL="${TAIL:-100}"
FOLLOW="${FOLLOW:-0}"

ARGS="logs --tail $TAIL"
[ "$FOLLOW" = "1" ] && ARGS="$ARGS -f"
[ -n "$SERVICE" ] && ARGS="$ARGS $SERVICE"

info "docker compose $ARGS"
if [ "$FOLLOW" = "1" ]; then
  ssh -t "${SSH_OPTS[@]}" "$DEPLOY_HOST" \
    "cd '$DEPLOY_DIR' && docker compose -f '$COMPOSE_FILE' $ARGS"
else
  dc "$ARGS"
fi
