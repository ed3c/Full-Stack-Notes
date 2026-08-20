#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any, NoReturn

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = Path(os.environ.get("PR6_RUNTIME_DIR", ROOT / ".runtime/pr6"))
EVIDENCE = Path(os.environ.get("RUNTIME_EVIDENCE_DIR", RUNTIME / "evidence"))
COMPOSE = Path(os.environ.get("PR6_COMPOSE_FILE", ROOT / "infra/resilience/compose.yml"))
PROJECT = os.environ.get("PR6_COMPOSE_PROJECT", "full-stack-notes-pr6")
BASE_SHA = os.environ.get("PR6_BASE_SHA", "c8e644fbd85cf495bc11b7954c38ef075d828702")
CONTROL = ROOT / "infra/resilience/runtime.sh"
BFF = "http://127.0.0.1:3000"
TOXI = "http://127.0.0.1:8474"
NGINX_LOG = EVIDENCE / "nginx-access.log"


def fail(message: str) -> NoReturn:
    print(f"resilience: FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def run(command: list[str], *, check: bool = True, env: dict[str, str] | None = None, timeout: int | None = None) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, env=merged, timeout=timeout, check=False)
    if check and result.returncode != 0:
        fail(f"command failed ({' '.join(command)}): {result.stderr.strip() or result.stdout.strip()}")
    return result


def compose(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(["docker", "compose", "-f", str(COMPOSE), "-p", PROJECT, *args], check=check)


def control(action: str) -> None:
    run([str(CONTROL), action])


def psql(sql: str) -> str:
    result = compose(
        "exec", "-T", "postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1",
        "-U", "workqueue", "-d", "workqueue", "-At", "-F", "\t", "-c", sql,
    )
    return result.stdout.strip()


def http(method: str, url: str, *, headers: dict[str, str] | None = None, body: dict[str, Any] | None = None, timeout: float = 6.0) -> tuple[int, dict[str, str], str, float]:
    data = None if body is None else json.dumps(body).encode()
    actual_headers = {"Accept": "application/json", **(headers or {})}
    if data is not None:
        actual_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, method=method, headers=actual_headers)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            text = response.read().decode()
            return response.status, dict(response.headers.items()), text, time.perf_counter() - started
    except urllib.error.HTTPError as exc:
        text = exc.read().decode(errors="replace")
        return exc.code, dict(exc.headers.items()), text, time.perf_counter() - started
    except Exception as exc:
        return 0, {}, type(exc).__name__, time.perf_counter() - started


def wait_until(predicate, label: str, timeout: float = 60.0, interval: float = 0.5) -> float:
    started = time.monotonic()
    deadline = started + timeout
    while time.monotonic() < deadline:
        if predicate():
            return time.monotonic() - started
        time.sleep(interval)
    fail(f"timeout waiting for {label}")


def write_drill(fid: str, trigger: str, expected: str, observed: Any, recovery: str, residual: str, **extra: Any) -> None:
    payload = {
        "id": fid,
        "result": "PASS",
        "trigger": trigger,
        "expected": expected,
        "observed": observed,
        "recovery": recovery,
        "residualRisk": residual,
        "evidenceKind": "executed runtime drill",
        **extra,
    }
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / f"{fid}.json").write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def create_item(request_id: str, key: str, title: str) -> dict[str, Any]:
    status, _, body, _ = http(
        "POST", f"{BFF}/v1/work-items",
        headers={"X-Request-Id": request_id, "Idempotency-Key": key},
        body={"title": title},
    )
    if status != 201:
        fail(f"create failed: status={status}, body={body}")
    value = json.loads(body)
    if not isinstance(value, dict) or not isinstance(value.get("id"), str):
        fail(f"create response malformed: {body}")
    return value


def wait_published(item_id: str, expected: int = 1) -> float:
    return wait_until(
        lambda: psql(
            f"SELECT count(*) FROM outbox_event WHERE aggregate_id='{item_id}'::uuid AND published_at IS NOT NULL"
        ) == str(expected),
        f"{expected} published outbox rows for {item_id}",
    )


def wait_audit(item_ids: list[str], expected: int) -> float:
    ids = ",".join(f"'{item_id}'::uuid" for item_id in item_ids)
    return wait_until(
        lambda: psql(f"SELECT count(*) FROM audit.audit_event WHERE aggregate_id IN ({ids})") == str(expected),
        f"{expected} audit rows",
    )


def kafka_ready() -> bool:
    result = compose(
        "exec", "-T", "kafka", "/opt/kafka/bin/kafka-topics.sh",
        "--bootstrap-server", "localhost:19092", "--list", check=False,
    )
    return result.returncode == 0


def group_lag() -> int:
    result = compose(
        "exec", "-T", "kafka", "/opt/kafka/bin/kafka-consumer-groups.sh",
        "--bootstrap-server", "localhost:19092", "--group", "audit-consumer-pr6", "--describe", check=False,
    )
    if result.returncode != 0:
        return -1
    total = 0
    found = False
    for line in result.stdout.splitlines():
        fields = line.split()
        if len(fields) >= 6 and fields[0] == "audit-consumer-pr6" and fields[1] == "work-item-events.v1" and fields[2].isdigit():
            try:
                total += int(fields[5])
                found = True
            except ValueError:
                pass
    return total if found else -1


def nginx_lines() -> list[str]:
    try:
        return NGINX_LOG.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return []


def request_lists(count: int, prefix: str) -> list[tuple[int, float]]:
    values = []
    for index in range(count):
        status, _, _, duration = http(
            "GET", f"{BFF}/v1/work-items?limit=1",
            headers={"X-Request-Id": f"{prefix}-{index:03d}"}, timeout=5,
        )
        values.append((status, duration))
    return values


def drill_f02() -> str:
    request_id = f"f02-{uuid.uuid4()}"
    item_key = f"f02-key-{uuid.uuid4()}"
    control("stop-kafka")
    time.sleep(1)
    item = create_item(request_id, item_key, "F-02 broker outage")
    item_id = item["id"]
    pending = psql(
        f"SELECT count(*) FROM outbox_event WHERE aggregate_id='{item_id}'::uuid AND published_at IS NULL"
    )
    if pending != "1":
        fail(f"F-02 expected one durable pending outbox row, got {pending}")
    control("start-kafka")
    wait_until(kafka_ready, "Kafka restart", timeout=60)
    publish_seconds = wait_published(item_id)
    audit_seconds = wait_audit([item_id], 1)
    audit_request = psql(
        f"SELECT request_id FROM audit.audit_event WHERE aggregate_id='{item_id}'::uuid LIMIT 1"
    )
    if audit_request != request_id:
        fail("F-02 request correlation did not survive recovery")
    write_drill(
        "F-02",
        "stop Kafka before an HTTP create commits",
        "HTTP create succeeds; outbox remains pending; restart publishes the same durable event",
        {"httpStatus": 201, "pendingBeforeRestart": 1, "requestId": request_id, "itemId": item_id,
         "publishRecoverySeconds": round(publish_seconds, 3), "auditRecoverySeconds": round(audit_seconds, 3)},
        "Kafka restart led to published outbox row and audit projection",
        "single-node broker outage only; no multi-broker durability claim",
    )
    return request_id


def drill_f05() -> None:
    toxic = {"name": "f05-latency", "type": "latency", "stream": "downstream", "toxicity": 1.0,
             "attributes": {"latency": 2500, "jitter": 0}}
    status, _, body, _ = http("POST", f"{TOXI}/proxies/work-http/toxics", body=toxic)
    if status not in (200, 201):
        fail(f"could not create Toxiproxy latency toxic: {status} {body}")
    try:
        status, _, body, duration = http(
            "GET", f"{BFF}/v1/work-items?limit=1",
            headers={"X-Request-Id": f"f05-{uuid.uuid4()}"}, timeout=5,
        )
        if status != 504:
            fail(f"F-05 expected bounded 504, got {status}: {body}")
        if duration > 3.5:
            fail(f"F-05 timeout exceeded bounded window: {duration:.3f}s")
    finally:
        http("DELETE", f"{TOXI}/proxies/work-http/toxics/f05-latency")
    recovered, _, _, recovery_duration = http("GET", f"{BFF}/v1/work-items?limit=1", timeout=5)
    if recovered != 200:
        fail("F-05 did not recover after latency toxic removal")
    write_drill(
        "F-05", "inject 2500ms downstream response latency", "BFF returns typed timeout within its absolute deadline",
        {"status": status, "boundedSeconds": round(duration, 3), "recoveryStatus": recovered},
        f"toxic removed; next request returned 200 in {recovery_duration:.3f}s",
        "one process and deterministic latency; wide-area jitter/packet loss remain unmeasured",
    )


def drill_f11_load_balancer() -> None:
    before = len(nginx_lines())
    statuses = request_lists(24, "f11-pre")
    if any(status != 200 for status, _ in statuses):
        fail("F-11 pre-fault traffic was not healthy")
    pre_lines = nginx_lines()[before:]
    if not any(":8081" in line for line in pre_lines) or not any(":8082" in line for line in pre_lines):
        fail("F-11 traffic did not exercise both Java instances before fault")

    control("stop-work-1")
    fault_start = time.perf_counter()
    during = request_lists(20, "f11-down")
    if any(status != 200 for status, _ in during):
        fail(f"F-11 load balancer did not mask instance removal: {during}")
    recovery_seconds = time.perf_counter() - fault_start
    post_lines = nginx_lines()[-20:]
    if not any(":8082" in line for line in post_lines):
        fail("F-11 surviving endpoint was not observed")
    if any(":8081" in line and "," not in line for line in post_lines[-5:]):
        fail("F-11 passive endpoint removal did not converge to surviving instance")

    time.sleep(2.5)
    control("start-work-1")
    rejoin_before = len(nginx_lines())
    request_lists(24, "f11-rejoin")
    rejoin = nginx_lines()[rejoin_before:]
    if not any(":8081" in line for line in rejoin):
        fail("F-11 recovered instance was not re-admitted after fail timeout")

    write_drill(
        "F-11-LB",
        "run two work-service instances behind Nginx, then terminate instance 1 during traffic",
        "both endpoints serve before fault; failed endpoint is passively removed; traffic remains successful; recovered endpoint rejoins",
        {"preFaultInstances": [8081, 8082], "duringFaultSuccesses": len(during), "recoverySeconds": round(recovery_seconds, 3),
         "discovery": "static Nginx upstream list", "health": "direct readiness preflight + Nginx passive max_fails/fail_timeout"},
        "instance 2 carried traffic; instance 1 was restarted and observed again",
        "local static discovery/passive health proves mechanism, not production service discovery or rollout operations",
    )


def drill_f11_pool() -> None:
    proc = subprocess.Popen(
        ["docker", "compose", "-f", str(COMPOSE), "-p", PROJECT, "exec", "-T", "postgres", "psql", "-X",
         "-v", "ON_ERROR_STOP=1", "-U", "workqueue", "-d", "workqueue", "-c",
         "BEGIN; LOCK TABLE work_item IN ACCESS EXCLUSIVE MODE; SELECT pg_sleep(5); COMMIT;"],
        cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    time.sleep(0.6)
    output = EVIDENCE / "load-db-pool.json"
    run([
        sys.executable, str(ROOT / "tests/load/http_load.py"), "--url", f"{BFF}/v1/work-items?limit=1",
        "--requests", "32", "--concurrency", "16", "--timeout", "4", "--output", str(output), "--label", "f11-pool",
    ], timeout=30)
    lock_stdout, lock_stderr = proc.communicate(timeout=10)
    if proc.returncode != 0:
        fail(f"F-11 DB lock process failed: {lock_stderr.strip() or lock_stdout.strip()}")
    load = json.loads(output.read_text(encoding="utf-8"))
    if float(load["errorRate"]) <= 0:
        fail("F-11 DB pool drill did not produce bounded saturation errors")
    logs = "\n".join(
        path.read_text(encoding="utf-8", errors="replace")
        for path in (RUNTIME / "logs").glob("work-service-*.log")
    )
    pool_signal = "Connection is not available" in logs or "HikariPool" in logs
    if not pool_signal:
        fail("F-11 DB pool exhaustion lacked a Hikari saturation signal")
    status, _, _, recovery_duration = http("GET", f"{BFF}/v1/work-items?limit=1", timeout=5)
    if status != 200:
        fail("F-11 DB pool did not recover after lock release")
    write_drill(
        "F-11",
        "hold ACCESS EXCLUSIVE work_item lock while 16-way traffic competes for two Hikari connections per instance",
        "pool acquisition becomes bounded/saturated, errors are observable, and service recovers after lock release",
        {"loadReceipt": output.name, "errorRate": load["errorRate"], "latencyMs": load["latencyMs"],
         "statusCounts": load["statusCounts"], "hikariSaturationSignal": pool_signal},
        f"database lock released; health request returned 200 in {recovery_duration:.3f}s",
        "synthetic table lock is a deterministic saturation trigger, not a production workload model",
    )


def drill_f14() -> None:
    control("stop-audit")
    ids: list[str] = []
    for index in range(3):
        item = create_item(f"f14-{index}-{uuid.uuid4()}", f"f14-key-{index}-{uuid.uuid4()}", f"F-14 lag {index}")
        ids.append(item["id"])
    for item_id in ids:
        wait_published(item_id)
    lag = wait_until(lambda: group_lag() >= 3, "consumer lag >= 3", timeout=30)
    lag_value = group_lag()
    started = time.perf_counter()
    control("start-audit")
    convergence = wait_audit(ids, 3,)
    wait_until(lambda: group_lag() == 0, "consumer lag convergence to zero", timeout=45)
    total = time.perf_counter() - started
    write_drill(
        "F-14",
        "stop the audit consumer, publish three events, observe group lag, then restart the consumer",
        "lag is measurable while stopped and converges to zero after restart without duplicate projections",
        {"lagBeforeRestart": lag_value, "lagObservationSeconds": round(lag, 3),
         "auditConvergenceSeconds": round(convergence, 3), "totalRecoverySeconds": round(total, 3)},
        "audit consumer restarted; all three projections appeared and Kafka group lag reached zero",
        "single partition/single consumer does not prove partition-scale rebalance behavior",
    )


def drill_f20(f02_request_id: str) -> None:
    request_id = f"f20-{uuid.uuid4()}"
    status, _, _, _ = http("GET", f"{BFF}/v1/work-items?limit=1", headers={"X-Request-Id": request_id})
    if status != 200:
        fail("F-20 correlation probe failed")
    time.sleep(3)
    services_status, _, services_body, _ = http("GET", "http://127.0.0.1:16686/api/services")
    if services_status != 200:
        fail("F-20 Jaeger API unavailable")
    services = json.loads(services_body).get("data", [])
    if "work-service" not in services or "audit-consumer" not in services:
        fail(f"F-20 expected Java services in Jaeger, found {services}")
    traces_status, _, traces_body, _ = http("GET", "http://127.0.0.1:16686/api/traces?service=work-service&limit=20")
    if traces_status != 200 or not json.loads(traces_body).get("data"):
        fail("F-20 Jaeger has no work-service traces")
    metrics_status, _, metrics_body, _ = http("GET", "http://127.0.0.1:19090/api/v1/label/__name__/values")
    if metrics_status != 200:
        fail("F-20 Prometheus API unavailable")
    metric_names = json.loads(metrics_body).get("data", [])
    interesting = [name for name in metric_names if "jvm" in name.lower() or "http" in name.lower() or "process" in name.lower()]
    if not interesting:
        fail("F-20 Prometheus received no runtime/http metrics")
    logs = nginx_lines()
    if not any(request_id in line for line in logs):
        fail("F-20 request ID missing from load-balancer logs")
    async_rows = psql(
        "SELECT count(*) FROM audit.audit_event WHERE request_id='" + f02_request_id.replace("'", "''") + "'"
    )
    if async_rows != "1":
        fail("F-20 async correlation ID missing from audit projection")
    write_drill(
        "F-20",
        "inspect a synchronous request and the recovered F-02 asynchronous event across traces, metrics, logs, and audit provenance",
        "Jaeger traces and Prometheus metrics exist; request IDs appear in edge logs; async request ID survives outbox/Kafka/audit boundary",
        {"jaegerServices": services, "prometheusMetricSample": interesting[:20], "syncRequestId": request_id,
         "asyncRequestId": f02_request_id, "asyncAuditRows": int(async_rows)},
        "multi-signal receipt joins trace/service telemetry with canonical request/event correlation instead of pretending scheduled outbox relay is one continuous request trace",
        "BFF is not yet OTel-auto-instrumented; cross-process trace continuity starts at Java and application correlation IDs bridge scheduled async work",
    )


def drill_f23() -> None:
    contract = ROOT / "packages/contracts/openapi.json"
    original = contract.read_bytes()
    try:
        value = json.loads(original)
        params = value["paths"]["/v1/work-items"]["post"]["parameters"]
        value["paths"]["/v1/work-items"]["post"]["parameters"] = [
            parameter for parameter in params if parameter.get("$ref") != "#/components/parameters/IdempotencyKey"
        ]
        contract.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
        env = {
            "PR5_RUNTIME_DIR": str(RUNTIME / "pr5"),
            "RUNTIME_EVIDENCE_DIR": str(EVIDENCE / "ai-guard-temp"),
        }
        rejected = run([sys.executable, str(ROOT / "tests/contract/verify_stack_contracts.py")], check=False, env=env)
        if rejected.returncode == 0:
            fail("F-23 plausible contract drift was not rejected")
        rejection = (rejected.stderr + rejected.stdout).strip()[-1200:]
    finally:
        contract.write_bytes(original)
    restored = run([sys.executable, str(ROOT / "tests/contract/verify_stack_contracts.py")], env={
        "PR5_RUNTIME_DIR": str(RUNTIME / "pr5"), "RUNTIME_EVIDENCE_DIR": str(EVIDENCE / "post-ai-guard")
    })
    write_drill(
        "F-23",
        "simulate an AI patch that silently removes the required Idempotency-Key from createWorkItem",
        "frozen-stack contract verification rejects the scope/contract drift, then passes again after restoration",
        {"rejected": True, "rejectionTail": rejection, "restoredGate": restored.returncode == 0},
        "working tree restored to canonical bytes and the contract gate passed",
        "this is a seeded AI-error simulation, not evidence of a real model incident",
    )


def baseline_load() -> None:
    output = EVIDENCE / "load-baseline.json"
    run([
        sys.executable, str(ROOT / "tests/load/http_load.py"), "--url", f"{BFF}/v1/work-items?limit=1",
        "--requests", "120", "--concurrency", "12", "--timeout", "4", "--output", str(output), "--label", "baseline",
    ], timeout=45)


def main() -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    baseline_load()
    f02_request = drill_f02()
    drill_f05()
    drill_f11_load_balancer()
    drill_f11_pool()
    drill_f14()
    drill_f20(f02_request)
    drill_f23()

    required = ["F-01", "F-02", "F-03", "F-04", "F-05", "F-11", "F-11-LB", "F-14", "F-17", "F-20", "F-23"]
    missing = [fid for fid in required if not (EVIDENCE / f"{fid}.json").is_file()]
    if missing:
        fail(f"missing drill receipts: {missing}")
    summary = {
        "result": "PASS",
        "evidenceState": "RUNTIME_EVIDENCE",
        "requiredDrills": required,
        "loadReceipts": ["load-baseline.json", "load-db-pool.json"],
        "telemetry": {"traces": "Jaeger + OTel file exporter", "metrics": "Prometheus + OTel", "logs": "Nginx/process logs"},
        "evidenceCeiling": "Local/CI deterministic resilience evidence only; no production traffic, SLO, multi-broker durability, or professional incident ownership claim.",
    }
    (EVIDENCE / "resilience-summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("resilience: PASS")


if __name__ == "__main__":
    main()
