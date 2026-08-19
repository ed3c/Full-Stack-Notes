#!/usr/bin/env python3
"""Dependency-free semantic smoke checks for the foundation contracts.

This intentionally does not replace a full OpenAPI/JSON-Schema validator. Its job is to
fail PR-0 if the role-critical boundaries disappear or drift before implementation
branches are built on top of them.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OPENAPI = ROOT / "packages" / "contracts" / "openapi.json"
EVENT_SCHEMA = ROOT / "packages" / "contracts" / "events" / "work-item-event.schema.json"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain a JSON object")
    return value


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_openapi(spec: dict[str, Any]) -> None:
    require(spec.get("openapi") == "3.1.0", "OpenAPI version must stay at 3.1.0")

    paths = spec.get("paths", {})
    create = paths.get("/v1/work-items", {}).get("post", {})
    transition = paths.get("/v1/work-items/{workItemId}/transitions", {}).get("post", {})

    require(create.get("operationId") == "createWorkItem", "createWorkItem operation is required")
    require(
        transition.get("operationId") == "transitionWorkItem",
        "transitionWorkItem operation is required",
    )

    def parameter_names(operation: dict[str, Any]) -> set[str]:
        names: set[str] = set()
        for param in operation.get("parameters", []):
            if "$ref" in param:
                names.add(param["$ref"].split("/")[-1])
            elif "name" in param:
                names.add(param["name"])
        return names

    create_params = parameter_names(create)
    transition_params = parameter_names(transition)
    require("IdempotencyKey" in create_params, "create must require Idempotency-Key")
    require("IdempotencyKey" in transition_params, "transition must require Idempotency-Key")
    require("If-Match" in transition_params, "transition must require optimistic-version If-Match")
    require("409" in create.get("responses", {}), "create must expose conflict semantics")
    require("409" in transition.get("responses", {}), "transition must expose conflict semantics")

    schemas = spec.get("components", {}).get("schemas", {})
    statuses = schemas.get("WorkItemStatus", {}).get("enum")
    require(
        statuses == ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"],
        "work-item state enum drifted from the documented state machine",
    )

    error_codes = schemas.get("ApiError", {}).get("properties", {}).get("code", {}).get("enum", [])
    for code in ("IDEMPOTENCY_CONFLICT", "VERSION_CONFLICT", "INVALID_TRANSITION"):
        require(code in error_codes, f"typed error code missing: {code}")


def validate_event_schema(schema: dict[str, Any]) -> None:
    require(
        schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
        "event schema must use JSON Schema 2020-12",
    )
    required = set(schema.get("required", []))
    for field in ("eventId", "eventType", "schemaVersion", "aggregateId", "aggregateVersion", "traceId", "payload"):
        require(field in required, f"event envelope field missing: {field}")

    props = schema.get("properties", {})
    require(props.get("schemaVersion", {}).get("const") == 1, "event schema version must be explicit")
    event_types = props.get("eventType", {}).get("enum", [])
    require("WorkItemCreated" in event_types, "WorkItemCreated event type missing")
    require("WorkItemTransitioned" in event_types, "WorkItemTransitioned event type missing")
    require("idempotencyKeyHash" in props, "event must define safe idempotency correlation semantics")


def main() -> int:
    validate_openapi(load_json(OPENAPI))
    validate_event_schema(load_json(EVENT_SCHEMA))
    print("contract smoke checks: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
