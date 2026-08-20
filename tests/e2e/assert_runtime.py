#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, NoReturn

ROOT = Path(__file__).resolve().parents[2]
RUNTIME_DIR = Path(os.environ.get("PR5_RUNTIME_DIR", ROOT / ".runtime/pr5"))
EVIDENCE_DIR = Path(os.environ.get("RUNTIME_EVIDENCE_DIR", RUNTIME_DIR / "evidence"))
COMPOSE_FILE = Path(os.environ.get("PR5_COMPOSE_FILE", ROOT / "infra/integration/compose.yml"))
PROJECT = os.environ.get("PR5_COMPOSE_PROJECT", "full-stack-notes-pr5")
UI_RECEIPT = Path(os.environ.get("E2E_UI_RECEIPT_PATH", EVIDENCE_DIR / "ui-receipt.json"))


def fail(message: str) -> NoReturn:
    print(f"runtime assertion: FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def psql(sql: str) -> str:
    command = [
        "docker",
        "compose",
        "-f",
        str(COMPOSE_FILE),
        "-p",
        PROJECT,
        "exec",
        "-T",
        "postgres",
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "workqueue",
        "-d",
        "workqueue",
        "-At",
        "-F",
        "\t",
        "-c",
        sql,
    ]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        fail(f"psql failed: {result.stderr.strip()}")
    return result.stdout.strip()


def read_receipt(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read UI receipt {path}: {exc}")
    if not isinstance(value, dict):
        fail("UI receipt must be a JSON object")
    return value


def wait_for_audit(aggregate_id: str, expected: int = 3, timeout_seconds: int = 45) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        count = psql(
            "SELECT count(*) FROM audit.audit_event "
            f"WHERE aggregate_id = '{aggregate_id}'::uuid;"
        )
        if count == str(expected):
            return
        time.sleep(0.5)
    fail(f"audit projection did not reach {expected} rows for aggregate {aggregate_id}")


def main() -> None:
    ui = read_receipt(UI_RECEIPT)
    item = ui.get("item")
    request_ids = ui.get("requestIds")
    idempotency_keys = ui.get("idempotencyKeys")
    if not isinstance(item, dict) or not isinstance(request_ids, dict) or not isinstance(idempotency_keys, list):
        fail("UI receipt is missing item/request/idempotency evidence")

    aggregate_id = item.get("id")
    if not isinstance(aggregate_id, str):
        fail("UI receipt item.id is missing")

    wait_for_audit(aggregate_id)

    work_row = psql(
        "SELECT id::text, title, status, version::text FROM work_item "
        f"WHERE id = '{aggregate_id}'::uuid;"
    ).split("\t")
    if len(work_row) != 4:
        fail("canonical work_item row is missing or malformed")
    if work_row[1] != item.get("title") or work_row[2:] != ["DONE", "3"]:
        fail(f"canonical domain state mismatch: {work_row}")

    outbox_rows = psql(
        "SELECT aggregate_version::text, event_type, request_id, "
        "CASE WHEN published_at IS NULL THEN 'pending' ELSE 'published' END "
        "FROM outbox_event "
        f"WHERE aggregate_id = '{aggregate_id}'::uuid ORDER BY aggregate_version;"
    ).splitlines()
    expected_outbox = [
        f"1\tWorkItemCreated\t{request_ids.get('create')}\tpublished",
        f"2\tWorkItemTransitioned\t{request_ids.get('claim')}\tpublished",
        f"3\tWorkItemTransitioned\t{request_ids.get('complete')}\tpublished",
    ]
    if outbox_rows != expected_outbox:
        fail(f"outbox publication/correlation mismatch: {outbox_rows}")

    audit_rows = psql(
        "SELECT aggregate_version::text, event_type, trace_id, request_id, "
        "kafka_topic, kafka_partition::text, kafka_offset::text "
        "FROM audit.audit_event "
        f"WHERE aggregate_id = '{aggregate_id}'::uuid ORDER BY aggregate_version;"
    ).splitlines()
    if len(audit_rows) != 3:
        fail(f"expected 3 audit rows, found {len(audit_rows)}")

    expected_mutation_ids = [
        request_ids.get("create"),
        request_ids.get("claim"),
        request_ids.get("complete"),
    ]
    parsed_audit: list[dict[str, Any]] = []
    for index, line in enumerate(audit_rows, start=1):
        fields = line.split("\t")
        if len(fields) != 7:
            fail(f"malformed audit row: {line}")
        version, event_type, trace_id, request_id, topic, partition, offset = fields
        expected_type = "WorkItemCreated" if index == 1 else "WorkItemTransitioned"
        expected_request_id = expected_mutation_ids[index - 1]
        if version != str(index) or event_type != expected_type:
            fail(f"audit event order/type mismatch: {line}")
        if request_id != expected_request_id or trace_id != expected_request_id:
            fail(f"sync/async correlation mismatch: {line}")
        if topic != "work-item-events.v1" or int(partition) < 0 or int(offset) < 0:
            fail(f"Kafka provenance mismatch: {line}")
        parsed_audit.append(
            {
                "aggregateVersion": int(version),
                "eventType": event_type,
                "traceId": trace_id,
                "requestId": request_id,
                "kafkaTopic": topic,
                "kafkaPartition": int(partition),
                "kafkaOffset": int(offset),
            }
        )

    raw_key_count = psql(
        "SELECT count(*) FROM outbox_event WHERE aggregate_id = "
        f"'{aggregate_id}'::uuid AND ("
        + " OR ".join(
            "event_json::text LIKE '%" + str(key).replace("'", "''") + "%'"
            for key in idempotency_keys
        )
        + ");"
    )
    if raw_key_count != "0":
        fail("raw idempotency key crossed the asynchronous boundary")

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    receipt = {
        "result": "PASS",
        "scenario": "happy-path integrated runtime",
        "evidenceState": "RUNTIME_EVIDENCE",
        "item": {
            "id": work_row[0],
            "title": work_row[1],
            "status": work_row[2],
            "version": int(work_row[3]),
        },
        "outbox": expected_outbox,
        "audit": parsed_audit,
        "evidenceCeiling": (
            "No broker outage, restart recovery, load, latency, multi-broker durability, "
            "browser/Web-Vitals, production traffic, or SLO claim."
        ),
    }
    (EVIDENCE_DIR / "runtime-receipt.json").write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print("runtime assertion: PASS")


if __name__ == "__main__":
    main()
