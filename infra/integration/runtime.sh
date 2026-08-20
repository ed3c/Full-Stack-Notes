#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${PR5_COMPOSE_FILE:-${ROOT}/infra/integration/compose.yml}"
PROJECT="${PR5_COMPOSE_PROJECT:-full-stack-notes-pr5}"
RUNTIME_DIR="${PR5_RUNTIME_DIR:-${ROOT}/.runtime/pr5}"
EVIDENCE_DIR="${RUNTIME_EVIDENCE_DIR:-${RUNTIME_DIR}/evidence}"
SOURCE_DIR="${RUNTIME_DIR}/sources"
LOG_DIR="${RUNTIME_DIR}/logs"
PID_DIR="${RUNTIME_DIR}/pids"
BFF_DIR="${SOURCE_DIR}/bff/apps/bff"
WEB_DIR="${SOURCE_DIR}/web/apps/web"
UI_RECEIPT="${EVIDENCE_DIR}/ui-receipt.json"

export PR5_RUNTIME_DIR="$RUNTIME_DIR"
export RUNTIME_EVIDENCE_DIR="$EVIDENCE_DIR"
export PR5_COMPOSE_FILE="$COMPOSE_FILE"
export PR5_COMPOSE_PROJECT="$PROJECT"
export E2E_UI_RECEIPT_PATH="$UI_RECEIPT"

compose() {
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT" "$@"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "required command not found: $1" >&2
    exit 2
  }
}

check_versions() {
  require_command docker
  require_command curl
  require_command java
  require_command mvn
  require_command node
  require_command npm
  require_command python3

  docker compose version >/dev/null
  java -version 2>&1 | grep -q 'version "21\.' || {
    echo "Java 21 is required" >&2
    exit 2
  }
  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  [[ "$node_major" == "24" ]] || {
    echo "Node.js 24 is required; found $(node --version)" >&2
    exit 2
  }
}

wait_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-120}"
  for ((i = 1; i <= attempts; i += 1)); do
    if curl --fail --silent --show-error --max-time 2 "$url" >/dev/null 2>&1; then
      echo "${label} ready"
      return
    fi
    sleep 1
  done
  echo "${label} did not become ready: ${url}" >&2
  return 1
}

start_process() {
  local name="$1"
  shift
  mkdir -p "$LOG_DIR" "$PID_DIR"
  "$@" >"${LOG_DIR}/${name}.log" 2>&1 &
  local pid=$!
  printf '%s\n' "$pid" >"${PID_DIR}/${name}.pid"
  sleep 1
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "${name} exited during startup" >&2
    tail -n 120 "${LOG_DIR}/${name}.log" >&2 || true
    return 1
  fi
  echo "started ${name} (pid=${pid})"
}

kill_processes() {
  if [[ ! -d "$PID_DIR" ]]; then
    return
  fi
  for pid_file in "$PID_DIR"/*.pid; do
    [[ -e "$pid_file" ]] || continue
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  for _ in {1..30}; do
    local alive=0
    for pid_file in "$PID_DIR"/*.pid; do
      [[ -e "$pid_file" ]] || continue
      local pid
      pid="$(cat "$pid_file")"
      if kill -0 "$pid" 2>/dev/null; then
        alive=1
      fi
    done
    [[ "$alive" == "0" ]] && break
    sleep 0.2
  done
  for pid_file in "$PID_DIR"/*.pid; do
    [[ -e "$pid_file" ]] || continue
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
  rm -rf "$PID_DIR"
}

prepare() {
  mkdir -p "$RUNTIME_DIR" "$EVIDENCE_DIR" "$LOG_DIR"
  "${ROOT}/infra/integration/prepare-sources.sh"
  python3 "${ROOT}/tests/contract/verify_stack_contracts.py"

  cp "${ROOT}/tests/e2e/live-runtime.test.tsx" "${WEB_DIR}/test/live-runtime.test.tsx"

  mvn -B -f "${ROOT}/services/work-service/pom.xml" -DskipTests package
  mvn -B -f "${ROOT}/services/audit-consumer/pom.xml" -DskipTests package
  npm --prefix "$BFF_DIR" ci
  npm --prefix "$BFF_DIR" run build
  npm --prefix "$WEB_DIR" ci
  npm --prefix "$WEB_DIR" run check
  npm --prefix "$WEB_DIR" run build
}

up() {
  check_versions
  down >/dev/null 2>&1 || true
  prepare

  compose up -d --wait postgres kafka

  local work_jar audit_jar
  work_jar="$(find "${ROOT}/services/work-service/target" -maxdepth 1 -type f -name 'work-service-*.jar' ! -name '*.original' | head -n 1)"
  audit_jar="$(find "${ROOT}/services/audit-consumer/target" -maxdepth 1 -type f -name 'audit-consumer-*.jar' ! -name '*.original' | head -n 1)"
  [[ -n "$work_jar" && -n "$audit_jar" ]] || {
    echo "packaged Java artifacts not found" >&2
    exit 3
  }

  start_process audit-consumer env \
    AUDIT_DATABASE_URL=jdbc:postgresql://127.0.0.1:5432/workqueue \
    AUDIT_DATABASE_USER=workqueue \
    AUDIT_DATABASE_PASSWORD=workqueue \
    KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9092 \
    AUDIT_TOPIC=work-item-events.v1 \
    AUDIT_GROUP_ID=audit-consumer-pr5 \
    java -jar "$audit_jar"

  start_process work-service env \
    PORT=8080 \
    DATABASE_URL=jdbc:postgresql://127.0.0.1:5432/workqueue \
    DATABASE_USER=workqueue \
    DATABASE_PASSWORD=workqueue \
    KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9092 \
    WORK_EVENTS_TOPIC=work-item-events.v1 \
    OUTBOX_RELAY_ENABLED=true \
    java -jar "$work_jar"

  wait_http 'http://127.0.0.1:8080/v1/work-items?limit=1' work-service

  start_process bff env \
    HOST=127.0.0.1 \
    PORT=3000 \
    WORK_SERVICE_BASE_URL=http://127.0.0.1:8080 \
    RATE_LIMIT_CAPACITY=1000 \
    RATE_LIMIT_REFILL_PER_SECOND=1000 \
    node "${BFF_DIR}/dist/src/server.js"

  wait_http 'http://127.0.0.1:3000/readyz' bff

  for _ in {1..60}; do
    if compose exec -T postgres psql -X -U workqueue -d workqueue -Atqc \
      "SELECT to_regclass('audit.audit_event') IS NOT NULL" 2>/dev/null | grep -q '^t$'; then
      echo "audit-consumer schema ready"
      return
    fi
    sleep 1
  done
  echo "audit-consumer schema did not become ready" >&2
  return 1
}

verify() {
  export E2E_BFF_URL="${E2E_BFF_URL:-http://127.0.0.1:3000}"
  npm --prefix "$WEB_DIR" run test:compile
  node --import "${WEB_DIR}/dist-test/test/setup.js" \
    --test "${WEB_DIR}/dist-test/test/live-runtime.test.js"
  python3 "${ROOT}/tests/e2e/assert_runtime.py"
}

down() {
  kill_processes
  compose down -v --remove-orphans >/dev/null 2>&1 || true
}

show_logs() {
  for log in "$LOG_DIR"/*.log; do
    [[ -e "$log" ]] || continue
    echo "===== ${log} ====="
    tail -n 200 "$log"
  done
  compose logs --no-color --tail=200 || true
}

run_all() {
  local result=0
  trap 'result=$?; if [[ $result -ne 0 ]]; then show_logs >&2 || true; fi; down; exit $result' EXIT
  up
  verify
}

case "${1:-run}" in
  prepare) check_versions; prepare ;;
  up) up ;;
  verify) verify ;;
  down) down ;;
  logs) show_logs ;;
  run) run_all ;;
  *)
    echo "usage: $0 {prepare|up|verify|down|logs|run}" >&2
    exit 2
    ;;
esac
