#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, NoReturn

ROOT = Path(__file__).resolve().parents[2]
LOCK_PATH = Path(os.environ.get("PR5_STACK_LOCK", ROOT / "infra/integration/stack-lock.json"))
RUNTIME_DIR = Path(os.environ.get("PR5_RUNTIME_DIR", ROOT / ".runtime/pr5"))
EVIDENCE_DIR = Path(os.environ.get("RUNTIME_EVIDENCE_DIR", RUNTIME_DIR / "evidence"))
SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")


def fail(message: str) -> NoReturn:
    print(f"contract gate: FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot parse {path}: {exc}")
    if not isinstance(value, dict):
        fail(f"{path} must contain a JSON object")
    return value


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_bytes(ref: str, path: str) -> bytes:
    result = subprocess.run(
        ["git", "show", f"{ref}:{path}"],
        cwd=ROOT,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        fail(f"cannot read {path} from integration base {ref}: {result.stderr.decode().strip()}")
    return result.stdout


def assert_equal_bytes(label: str, left: bytes, right: bytes) -> None:
    if left != right:
        fail(f"{label} drifted across a frozen stack boundary")


def main() -> None:
    lock = read_json(LOCK_PATH)
    if lock.get("schemaVersion") != 1:
        fail("unsupported stack-lock schemaVersion")

    base = lock.get("integrationBase")
    siblings = lock.get("siblings")
    if not isinstance(base, dict) or not isinstance(siblings, dict):
        fail("stack-lock must define integrationBase and siblings")

    base_sha = base.get("sha")
    if not isinstance(base_sha, str) or not SHA_PATTERN.fullmatch(base_sha):
        fail("integrationBase.sha must be a full commit SHA")

    for name in ("bff", "web"):
        component = siblings.get(name)
        if not isinstance(component, dict):
            fail(f"missing sibling lock: {name}")
        component_sha = component.get("sha")
        if not isinstance(component_sha, str) or not SHA_PATTERN.fullmatch(component_sha):
            fail(f"siblings.{name}.sha must be a full commit SHA")
        marker = RUNTIME_DIR / "sources" / name / ".pr5-source-sha"
        if not marker.is_file() or marker.read_text(encoding="utf-8").strip() != component_sha:
            fail(f"materialized {name} source does not match stack-lock SHA")

    owned_diff = subprocess.run(
        [
            "git",
            "diff",
            "--exit-code",
            base_sha,
            "--",
            "apps",
            "services",
            "packages/contracts",
        ],
        cwd=ROOT,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if owned_diff.returncode != 0:
        fail("PR-5 modified a sibling-owned implementation or frozen contract:\n" + owned_diff.stdout)

    openapi_path = ROOT / "packages/contracts/openapi.json"
    event_path = ROOT / "packages/contracts/events/work-item-event.schema.json"
    if not openapi_path.is_file() or not event_path.is_file():
        fail("canonical OpenAPI/event contracts are missing")

    assert_equal_bytes(
        "OpenAPI contract vs PR-4 base",
        openapi_path.read_bytes(),
        git_bytes(base_sha, "packages/contracts/openapi.json"),
    )
    assert_equal_bytes(
        "event contract vs PR-4 base",
        event_path.read_bytes(),
        git_bytes(base_sha, "packages/contracts/events/work-item-event.schema.json"),
    )

    for name in ("bff", "web"):
        sibling_openapi = RUNTIME_DIR / "sources" / name / "packages/contracts/openapi.json"
        if not sibling_openapi.is_file():
            fail(f"{name} snapshot lacks the frozen OpenAPI contract")
        assert_equal_bytes(
            f"OpenAPI contract vs {name} snapshot",
            openapi_path.read_bytes(),
            sibling_openapi.read_bytes(),
        )

    openapi = read_json(openapi_path)
    operation_ids = {
        operation.get("operationId")
        for path_item in openapi.get("paths", {}).values()
        if isinstance(path_item, dict)
        for operation in path_item.values()
        if isinstance(operation, dict)
    }
    required_operations = {"listWorkItems", "getWorkItem", "createWorkItem", "transitionWorkItem"}
    if not required_operations.issubset(operation_ids):
        fail(f"OpenAPI operation set is incomplete: {sorted(required_operations - operation_ids)}")

    event_schema = read_json(event_path)
    event_types = event_schema.get("properties", {}).get("eventType", {}).get("enum", [])
    if event_types != ["WorkItemCreated", "WorkItemTransitioned"]:
        fail("event type set/version drifted")
    if event_schema.get("properties", {}).get("schemaVersion", {}).get("const") != 1:
        fail("event schemaVersion must remain 1 for this stack")

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    receipt = {
        "gate": "PR-5 frozen stack contracts",
        "result": "PASS",
        "integrationBase": base_sha,
        "bff": siblings["bff"]["sha"],
        "web": siblings["web"]["sha"],
        "openapiSha256": sha256(openapi_path),
        "eventSchemaSha256": sha256(event_path),
        "operations": sorted(required_operations),
        "eventTypes": event_types,
    }
    (EVIDENCE_DIR / "contract-receipt.json").write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print("contract gate: PASS")


if __name__ == "__main__":
    main()
