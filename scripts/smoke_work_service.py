#!/usr/bin/env python3
"""HTTP smoke test for the Java work-service against a real PostgreSQL instance."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

BASE = "http://127.0.0.1:8080"


def call(
    method: str,
    path: str,
    *,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], Any]:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    merged = {"Accept": "application/json", **(headers or {})}
    if payload is not None:
        merged["Content-Type"] = "application/json"
    request = urllib.request.Request(BASE + path, data=payload, headers=merged, method=method)
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            raw = response.read()
            parsed = json.loads(raw) if raw else None
            return response.status, dict(response.headers), parsed
    except urllib.error.HTTPError as error:
        raw = error.read()
        parsed = json.loads(raw) if raw else None
        return error.code, dict(error.headers), parsed


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    status, headers, created = call(
        "POST",
        "/v1/work-items",
        headers={"Idempotency-Key": "smoke-create-0001", "X-Request-Id": "smoke-request-1"},
        body={"title": "HTTP smoke item", "description": "contract proof"},
    )
    require(status == 201, f"create expected 201, got {status}: {created}")
    require(headers.get("Idempotency-Replayed") == "false", "first create must not be replayed")
    require(headers.get("X-Request-Id") == "smoke-request-1", "request ID must round-trip")
    require(created["status"] == "OPEN" and created["version"] == 1, "create state/version mismatch")

    status, headers, replay = call(
        "POST",
        "/v1/work-items",
        headers={"Idempotency-Key": "smoke-create-0001"},
        body={"title": "HTTP smoke item", "description": "contract proof"},
    )
    require(status == 201, f"replay expected 201, got {status}: {replay}")
    require(headers.get("Idempotency-Replayed") == "true", "second create must be replayed")
    require(replay == created, "idempotent replay must return the original response snapshot")

    status, _, conflict = call(
        "POST",
        "/v1/work-items",
        headers={"Idempotency-Key": "smoke-create-0001"},
        body={"title": "different request", "description": "contract proof"},
    )
    require(status == 409, f"key reuse expected 409, got {status}: {conflict}")
    require(conflict["code"] == "IDEMPOTENCY_CONFLICT", "wrong idempotency conflict code")
    require(bool(conflict["requestId"]), "typed error must include requestId")

    work_item_id = created["id"]
    status, _, invalid = call(
        "POST",
        f"/v1/work-items/{work_item_id}/transitions",
        headers={"Idempotency-Key": "smoke-invalid-0001", "If-Match": "1"},
        body={"action": "COMPLETE"},
    )
    require(status == 409, f"invalid transition expected 409, got {status}: {invalid}")
    require(invalid["code"] == "INVALID_TRANSITION", "wrong invalid transition code")

    status, _, claimed = call(
        "POST",
        f"/v1/work-items/{work_item_id}/transitions",
        headers={"Idempotency-Key": "smoke-claim-0001", "If-Match": "1"},
        body={"action": "CLAIM"},
    )
    require(status == 200, f"claim expected 200, got {status}: {claimed}")
    require(claimed["status"] == "IN_PROGRESS" and claimed["version"] == 2, "claim state/version mismatch")

    status, _, stale = call(
        "POST",
        f"/v1/work-items/{work_item_id}/transitions",
        headers={"Idempotency-Key": "smoke-stale-0001", "If-Match": "1"},
        body={"action": "RELEASE"},
    )
    require(status == 409, f"stale transition expected 409, got {status}: {stale}")
    require(stale["code"] == "VERSION_CONFLICT", "wrong optimistic concurrency conflict code")

    status, _, fetched = call("GET", f"/v1/work-items/{work_item_id}")
    require(status == 200, f"get expected 200, got {status}: {fetched}")
    require(fetched["status"] == "IN_PROGRESS" and fetched["version"] == 2, "failed mutation changed state")

    print("work-service HTTP smoke: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
