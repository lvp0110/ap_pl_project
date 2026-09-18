#!/usr/bin/env bash
# Общие функции deploy-скриптов. Source'ится в начале каждого скрипта.
#
# Прод — Docker Compose на webtest (51.250.51.86). Сборка идёт НА СЕРВЕРЕ:
# docker compose build тянет Node 22 внутрь образа, локальный Node не нужен.
# leonidl в группе docker → sudo для docker не требуется.

set -euo pipefail

info() { echo -e "\033[36m→ $*\033[0m"; }
ok()   { echo -e "\033[32m✓ $*\033[0m"; }
warn() { echo -e "\033[33m! $*\033[0m" >&2; }
fail() { echo -e "\033[31m✗ $*\033[0m" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.deploy"

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ $ENV_FILE не найден." >&2
  echo "  Скопируйте шаблон:  cp deploy/.env.deploy.example deploy/.env.deploy" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${DEPLOY_HOST:?DEPLOY_HOST не задан в deploy/.env.deploy}"
: "${DEPLOY_DIR:?DEPLOY_DIR не задан в deploy/.env.deploy}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
DEPLOY_REV="${DEPLOY_REV:-origin/main}"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
# Host-порт, на который смотрит nginx (см. docker-compose.prod.yml).
FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-3008}"

SSH_OPTS=(-o ControlMaster=auto -o ControlPath="/tmp/.ssh-ap_pl_project-%r@%h:%p" -o ControlPersist=5m)

# Явный приватный ключ. Локально нужен всегда: у алиаса этой машины в
# ~/.ssh/config нет IdentityFile. В CI не задаётся — там ключ пишется из
# секрета DEPLOY_SSH_KEY в дефолтный ~/.ssh/id_ed25519.
DEPLOY_SSH_KEY_FILE="${DEPLOY_SSH_KEY_FILE:-}"
if [ -n "$DEPLOY_SSH_KEY_FILE" ]; then
  eval "DEPLOY_SSH_KEY_FILE=$DEPLOY_SSH_KEY_FILE"
  [ -f "$DEPLOY_SSH_KEY_FILE" ] || fail "DEPLOY_SSH_KEY_FILE=$DEPLOY_SSH_KEY_FILE — файл не найден"
  SSH_OPTS+=(-o IdentitiesOnly=yes -i "$DEPLOY_SSH_KEY_FILE")
fi

ssh_exec() {
  ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"
}

# Для команд с sudo: при локальном TTY выделяем его на той стороне, иначе
# sudo не сможет запросить пароль. В CI (без TTY) sudo обязан быть NOPASSWD.
ssh_sudo() {
  if [ -t 0 ] && [ -t 1 ]; then
    ssh -t ${DEPLOY_SSH_KEY_FILE:+-o IdentitiesOnly=yes -i "$DEPLOY_SSH_KEY_FILE"} \
      "$DEPLOY_HOST" "$@"
  else
    ssh_exec "$@"
  fi
}

remote() {
  local cmd="$*"
  ssh_exec "set -e; cd '$DEPLOY_DIR' && $cmd"
}

dc() {
  remote "docker compose -f '$COMPOSE_FILE' $*"
}

# Дождаться ответа фронта на host-порту. $1 — число попыток (×2s).
wait_health() {
  local tries="${1:-20}" i
  for ((i = 1; i <= tries; i++)); do
    if remote "curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:$FRONTEND_HOST_PORT/__front_health" 2>/dev/null; then
      ok "frontend отвечает на 127.0.0.1:$FRONTEND_HOST_PORT"
      return 0
    fi
    sleep 2
  done
  warn "frontend не ответил за $((tries * 2))s"
  return 1
}

# Роллаут делает `git checkout <rev> -- <paths>`: файлы обновляются, HEAD стоит
# на месте. Поэтому выкаченная ревизия пишется в маркер .deployed-frontend.
mark_deployed() {
  local rev="$1"
  remote "printf '%s\t%s\t%s\n' \
    \"\$(git rev-parse --short '$rev')\" \
    \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" \
    \"\$(git log -1 --format=%s '$rev')\" > '.deployed-frontend'"
}

show_deployed() {
  local line
  line="$(remote "cat '.deployed-frontend' 2>/dev/null || true" 2>/dev/null || true)"
  if [ -n "$line" ]; then
    printf '  frontend  %s\n' "$line"
  else
    printf '  frontend  маркера нет (роллаут этим скриптом ещё не делался)\n'
  fi
}
