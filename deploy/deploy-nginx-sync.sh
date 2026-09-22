#!/usr/bin/env bash
# Синхронизировать nginx server block с шаблоном из репо.
#
#   1) подставляет DEPLOY_DOMAIN / DEPLOY_CERT_DIR в deploy/nginx/crmakyfon.conf
#   2) rsync результата в staging на сервере ($DEPLOY_DIR/deploy/nginx/)
#   3) sudo cp staging → /etc/nginx/sites-available/crmakyfon.conf
#   4) sudo ln -sf в sites-enabled (idempotent)
#   5) sudo nginx -t
#
# Reload — отдельным шагом (deploy-nginx-reload.sh), чтобы при ошибке nginx -t
# ничего не применилось.
#
# Нужен sudo: с паролем локально, NOPASSWD в CI.
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

: "${DEPLOY_DOMAIN:?DEPLOY_DOMAIN не задан в deploy/.env.deploy}"

DEPLOY_DOMAIN="$(printf '%s' "$DEPLOY_DOMAIN" | tr -d '[:space:]')"
DEPLOY_CERT_DIR="$(printf '%s' "${DEPLOY_CERT_DIR:-/etc/letsencrypt/live/$DEPLOY_DOMAIN}" | tr -d '[:space:]')"

LOCAL_TEMPLATE="$REPO_ROOT/deploy/nginx/crmakyfon.conf"
LOCAL_RENDERED="$(mktemp -t crmakyfon.nginx.XXXXXX.conf)"
REMOTE_STAGE_DIR="$DEPLOY_DIR/deploy/nginx"
REMOTE_STAGE_FILE="$REMOTE_STAGE_DIR/crmakyfon.rendered.conf"
SYSTEM_CONF="/etc/nginx/sites-available/crmakyfon.conf"
SYSTEM_LINK="/etc/nginx/sites-enabled/crmakyfon.conf"

trap 'rm -f "$LOCAL_RENDERED"' EXIT

info "рендерю шаблон: <domain>=$DEPLOY_DOMAIN, <cert_dir>=$DEPLOY_CERT_DIR"
sed -e "s|<domain>|$DEPLOY_DOMAIN|g" \
    -e "s|<cert_dir>|$DEPLOY_CERT_DIR|g" \
    "$LOCAL_TEMPLATE" > "$LOCAL_RENDERED"

if grep -Eq '<domain>|<cert_dir>' "$LOCAL_RENDERED"; then
  fail "в рендере остались неподставленные плейсхолдеры"
fi

info "ssl_certificate в рендере:"
grep -E "ssl_certificate" "$LOCAL_RENDERED" || warn "ssl_certificate в шаблоне не найден"

info "rsync → $DEPLOY_HOST:$REMOTE_STAGE_FILE"
ssh_exec "mkdir -p '$REMOTE_STAGE_DIR'"
rsync -az -e "ssh ${SSH_OPTS[*]}" "$LOCAL_RENDERED" "$DEPLOY_HOST:$REMOTE_STAGE_FILE"

info "копирую staging → $SYSTEM_CONF и валидирую nginx -t"
ssh_sudo "sudo cp '$REMOTE_STAGE_FILE' '$SYSTEM_CONF' && \
  sudo ln -sf '$SYSTEM_CONF' '$SYSTEM_LINK' && \
  sudo nginx -t"

ok "nginx config обновлён и валиден; reload — deploy-nginx-reload.sh"
