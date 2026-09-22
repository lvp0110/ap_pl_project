#!/usr/bin/env bash
# Проверить nginx-конфиг на сервере и перечитать его.
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

info "nginx -t && systemctl reload nginx"
ssh_sudo "sudo nginx -t && sudo systemctl reload nginx"

ok "nginx перечитан"
