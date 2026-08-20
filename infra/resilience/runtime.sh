#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT}/infra/resilience/compose.yml"
PROJECT="${PR6_COMPOSE_PROJECT:-full-stack-notes-pr6}"
RUNTIME_DIR="${PR6_RUNTIME_DIR:-${ROOT}/.runtime/pr6}"
EVIDENCE_DIR="${RUNTIME_EVIDENCE_DIR:-${RUNTIME_DIR}/evidence}"
PR5_RUNTIME_DIR="${RUNTIME_DIR}/pr5"
SOURCE_DIR="${PR5_RUNTIME_DIR}/sources"
BFF_DIR="${SOURCE_DIR}/bff/apps/bff"
WEB_DIR="${SOURCE_DIR}/web/apps/web"
LOG_DIR="${RUNTIME_DIR}/logs"
PID_DIR="${RUNTIME_DIR}/pids"
OTEL_DIR="${RUNTIME_DIR}/otel"
OTEL_AGENT="${OTEL_DIR}/opentelemetry-javaagent.jar"

export PR6_RUNTIME_DIR="$RUNTIME_DIR"
export PR6_EVIDENCE_DIR="$EVIDENCE_DIR"
export RUNTIME_EVIDENCE_DIR="$EVIDENCE_DIR"
export PR6_COMPOSE_PROJECT="$PROJECT"
export PR6_COMPOSE_FILE="$COMPOSE_FILE"
export PR6_BASE_SHA="${PR6_BASE_SHA:-c8e644fbd85cf495bc11b7954c38ef075d828702}"

compose() {
  PR6_EVIDENCE_DIR="$EVIDENCE_DIR" docker compose -f "$COMPOSE_FILE" -p "$PROJECT" "$@"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || { echo "required command not found: $1" >&2; exit 2; }
}

check_versions() {
  for command in docker curl java mvn node npm python3; do require_command "$command"; done
  docker compose version >/dev/null
  java -version 2>&1 | grep -q 'version "21\.' || { echo "Java 21 is required" >&2; exit 2; }
  [[ "$(node -p 'process.versions.node.split(".")[0]')" == "24" ]] || { echo "Node.js 24 is required" >&2; exit 2; }
}

wait_http() {
  local url="$1" label="$2" attempts="${3:-120}"
  for ((i=1; i<=attempts; i+=1)); do
    if curl --fail --silent --max-time 2 "$url" >/dev/null 2>&1; then echo "$label ready"; return 0; fi
    sleep 1
  done
  echo "$label did not become ready: $url" >&2
  return 1
}

start_process() {
  local name="$1"; shift
  mkdir -p "$LOG_DIR" "$PID_DIR"
  "$@" >"${LOG_DIR}/${name}.log" 2>&1 &
  local pid=$!
  printf '%s\n' "$pid" >"${PID_DIR}/${name}.pid"
  sleep 1
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "$name exited during startup" >&2
    tail -n 160 "${LOG_DIR}/${name}.log" >&2 || true
    return 1
  fi
}

stop_named() {
  local name="$1" pid_file="${PID_DIR}/${name}.pid"
  [[ -f "$pid_file" ]] || return 0
  local pid; pid="$(cat "$pid_file")"
  if kill -0 "$pid" 2>/dev/null; then kill "$pid" 2>/dev/null || true; fi
  for _ in {1..50}; do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.1
  done
  if kill -0 "$pid" 2>/dev/null; then kill -9 "$pid" 2>/dev/null || true; fi
  rm -f "$pid_file"
}

kill_processes() {
  [[ -d "$PID_DIR" ]] || return 0
  for file in "$PID_DIR"/*.pid; do [[ -e "$file" ]] || continue; stop_named "$(basename "$file" .pid)"; done
  rm -rf "$PID_DIR"
}

java_env() {
  local service_name="$1" instance_id="$2"
  env \
    JAVA_TOOL_OPTIONS="-javaagent:${OTEL_AGENT}" \
    OTEL_SERVICE_NAME="$service_name" \
    OTEL_RESOURCE_ATTRIBUTES="service.instance.id=${instance_id},deployment.environment.name=pr6-ci" \
    OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318 \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_TRACES_EXPORTER=otlp \
    OTEL_METRICS_EXPORTER=otlp \
    OTEL_LOGS_EXPORTER=otlp \
    OTEL_INSTRUMENTATION_LOGBACK_APPENDER_ENABLED=true \
    OTEL_INSTRUMENTATION_HTTP_SERVER_CAPTURE_REQUEST_HEADERS=x-request-id \
    OTEL_INSTRUMENTATION_HTTP_CLIENT_CAPTURE_REQUEST_HEADERS=x-request-id \
    "$@"
}

work_jar() { find "${ROOT}/services/work-service/target" -maxdepth 1 -type f -name 'work-service-*.jar' ! -name '*.original' | head -n 1; }
audit_jar() { find "${ROOT}/services/audit-consumer/target" -maxdepth 1 -type f -name 'audit-consumer-*.jar' ! -name '*.original' | head -n 1; }

start_work() {
  local index="$1" port instance jar
  port=$((8080 + index)); instance="work-${index}"; jar="$(work_jar)"
  start_process "work-service-${index}" java_env work-service "$instance" \
    PORT="$port" \
    DATABASE_URL=jdbc:postgresql://127.0.0.1:55432/workqueue \
    DATABASE_USER=workqueue DATABASE_PASSWORD=workqueue \
    KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:19092 WORK_EVENTS_TOPIC=work-item-events.v1 \
    OUTBOX_RELAY_ENABLED=true OUTBOX_RELAY_FIXED_DELAY=PT0.2S \
    SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=2 \
    SPRING_DATASOURCE_HIKARI_CONNECTION_TIMEOUT=300 \
    java -jar "$jar"
  wait_http "http://127.0.0.1:${port}/v1/work-items?limit=1" "work-service-${index}"
}

start_audit() {
  local jar; jar="$(audit_jar)"
  start_process audit-consumer java_env audit-consumer audit-1 \
    AUDIT_DATABASE_URL=jdbc:postgresql://127.0.0.1:55432/workqueue \
    AUDIT_DATABASE_USER=workqueue AUDIT_DATABASE_PASSWORD=workqueue \
    KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:19092 AUDIT_TOPIC=work-item-events.v1 \
    AUDIT_GROUP_ID=audit-consumer-pr6 \
    java -jar "$jar"
}

start_bff() {
  start_process bff env HOST=127.0.0.1 PORT=3000 \
    WORK_SERVICE_BASE_URL=http://127.0.0.1:18080 \
    UPSTREAM_TIMEOUT_MS=1500 MAX_UPSTREAM_ATTEMPTS=2 \
    RATE_LIMIT_CAPACITY=5000 RATE_LIMIT_REFILL_PER_SECOND=5000 \
    node "${BFF_DIR}/dist/src/server.js"
  wait_http http://127.0.0.1:3000/readyz bff
}

configure_toxiproxy() {
  wait_http http://127.0.0.1:8474/version toxiproxy
  curl --silent --show-error -X DELETE http://127.0.0.1:8474/proxies/work-http >/dev/null 2>&1 || true
  curl --fail --silent --show-error -H 'Content-Type: application/json' \
    -d '{"name":"work-http","listen":"0.0.0.0:18080","upstream":"nginx:8080"}' \
    http://127.0.0.1:8474/proxies >/dev/null
}

record_inherited() {
  local id="$1" trigger="$2" expected="$3" observed="$4" residual="$5"
  python3 - "$EVIDENCE_DIR/${id}.json" "$id" "$trigger" "$expected" "$observed" "$residual" <<'PY'
import json, pathlib, sys
path, fid, trigger, expected, observed, residual = sys.argv[1:]
pathlib.Path(path).write_text(json.dumps({
  "id": fid, "result": "PASS", "trigger": trigger, "expected": expected,
  "observed": observed, "recovery": "deterministic test completed without leaked state",
  "residualRisk": residual, "evidenceKind": "re-executed deterministic regression"
}, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
}

prepare() {
  mkdir -p "$RUNTIME_DIR" "$EVIDENCE_DIR" "$LOG_DIR" "$OTEL_DIR"
  PR5_RUNTIME_DIR="$PR5_RUNTIME_DIR" RUNTIME_EVIDENCE_DIR="${EVIDENCE_DIR}/pr5" \
    "${ROOT}/infra/integration/runtime.sh" prepare
  mvn -q dependency:copy \
    -Dartifact=io.opentelemetry.javaagent:opentelemetry-javaagent:2.30.0 \
    -DoutputDirectory="$OTEL_DIR" -Dmdep.stripVersion=true
  [[ -f "$OTEL_AGENT" ]] || { echo "OpenTelemetry Java agent was not materialized" >&2; exit 3; }
}

run_inherited_drills() {
  compose up -d --wait postgres
  DATABASE_URL=jdbc:postgresql://127.0.0.1:55432/workqueue DATABASE_USER=workqueue DATABASE_PASSWORD=workqueue \
    OUTBOX_RELAY_ENABLED=false \
    mvn -B -q -f "${ROOT}/services/work-service/pom.xml" \
      -Dtest='WorkItemServiceIntegrationTest#concurrentDuplicateCreateProducesOneResource' test
  record_inherited F-01 "two concurrent creates with one idempotency key" "one resource; one replay" \
    "WorkItemServiceIntegrationTest concurrent duplicate create passed" "single-process test; distributed retry pressure is separately bounded by BFF/load drills"

  DATABASE_URL=jdbc:postgresql://127.0.0.1:55432/workqueue DATABASE_USER=workqueue DATABASE_PASSWORD=workqueue \
    OUTBOX_RELAY_ENABLED=false \
    mvn -B -q -f "${ROOT}/services/work-service/pom.xml" \
      -Dtest='WorkItemServiceIntegrationTest#concurrentTransitionsPreventLostUpdate' test
  record_inherited F-04 "two transitions race on the same expected version" "one wins; one typed version conflict" \
    "WorkItemServiceIntegrationTest lost-update race passed" "database/host scheduling differs from production contention"

  AUDIT_DATABASE_URL=jdbc:postgresql://127.0.0.1:55432/workqueue AUDIT_DATABASE_USER=workqueue AUDIT_DATABASE_PASSWORD=workqueue \
    mvn -B -q -f "${ROOT}/services/audit-consumer/pom.xml" \
      -Dtest='AuditConsumerIntegrationTest#duplicateDeliveryProducesOneProjectionAndPreservesCorrelation' test
  record_inherited F-03 "deliver the same event twice" "one projection and preserved correlation" \
    "AuditConsumerIntegrationTest duplicate delivery passed" "embedded Kafka proves semantics, not broker-fleet behavior"

  npm --prefix "$WEB_DIR" run test:compile
  node --import "${WEB_DIR}/dist-test/test/setup.js" --test "${WEB_DIR}/dist-test/test/async-state.test.js"
  record_inherited F-17 "resolve older list requests after newer state" "stale response cannot overwrite newer state" \
    "React async-state regression suite passed" "JSDOM is deterministic state evidence, not browser timing/Web-Vitals evidence"

  compose down -v --remove-orphans >/dev/null 2>&1 || true
}

up() {
  check_versions
  kill_processes || true
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  prepare
  run_inherited_drills
  compose up -d --wait postgres kafka jaeger otel-collector prometheus nginx toxiproxy
  configure_toxiproxy
  start_audit
  start_work 1
  start_work 2
  start_bff
  for _ in {1..60}; do
    if compose exec -T postgres psql -X -U workqueue -d workqueue -Atqc "SELECT to_regclass('audit.audit_event') IS NOT NULL" 2>/dev/null | grep -q '^t$'; then break; fi
    sleep 1
  done
  wait_http http://127.0.0.1:16686/api/services jaeger
  wait_http http://127.0.0.1:19090/-/ready prometheus
}

down() {
  kill_processes || true
  compose down -v --remove-orphans >/dev/null 2>&1 || true
}

show_logs() {
  for log in "$LOG_DIR"/*.log; do [[ -e "$log" ]] || continue; echo "===== $log ====="; tail -n 200 "$log"; done
  compose logs --no-color --tail=160 || true
}

run_all() {
  local result=0
  trap 'result=$?; if [[ $result -ne 0 ]]; then show_logs >&2 || true; fi; down; exit $result' EXIT
  up
  python3 "${ROOT}/tests/failure/run_resilience.py"
}

case "${1:-run}" in
  prepare) check_versions; prepare ;;
  up) up ;;
  down) down ;;
  logs) show_logs ;;
  run) run_all ;;
  stop-audit) stop_named audit-consumer ;;
  start-audit) start_audit ;;
  stop-work-1) stop_named work-service-1 ;;
  start-work-1) start_work 1 ;;
  stop-kafka) compose stop kafka ;;
  start-kafka) compose start kafka; wait_http http://127.0.0.1:8474/version toxiproxy >/dev/null ;;
  *) echo "usage: $0 {prepare|up|down|logs|run|stop-audit|start-audit|stop-work-1|start-work-1|stop-kafka|start-kafka}" >&2; exit 2 ;;
esac
