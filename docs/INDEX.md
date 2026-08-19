# Documentation Index

## Agent and reviewer entry

```text
README.md
→ AGENTS.md
→ prd/requirements.json
→ docs/architecture/README.md
→ docs/role/ROLE_EVIDENCE_MATRIX.md
→ docs/governance/SHADOW_ARCHITECT_LEDGER.md
→ exact issue / PR / check / receipt
```

## Product and architecture

- [`product/MVP_SCOPE.md`](product/MVP_SCOPE.md) — user problem, workflow, product states, acceptance scenarios and release slices.
- [`architecture/README.md`](architecture/README.md) — components, authority, data model, consistency, concurrency, resilience, frontend, operations and alternatives.
- [`../diagrams/data-flow.mmd`](../diagrams/data-flow.mmd) — canonical Mermaid source for the end-to-end data/evidence flow.
- [`../contracts/openapi/delivery-pulse.yaml`](../contracts/openapi/delivery-pulse.yaml) — candidate HTTP contract.
- [`../contracts/events/initiative-status-changed.v1.json`](../contracts/events/initiative-status-changed.v1.json) — candidate durable event contract.

## Role and interview

- [`role/ROLE_EVIDENCE_MATRIX.md`](role/ROLE_EVIDENCE_MATRIX.md) — every hiring signal mapped to implementation and proof.
- [`interview/SYSTEM_DESIGN_INTERVIEW_MAP.md`](interview/SYSTEM_DESIGN_INTERVIEW_MAP.md) — role-specific system-design route and follow-ups.
- [`operations/FAILURE_EXPERIENCE_CATALOG.md`](operations/FAILURE_EXPERIENCE_CATALOG.md) — failure injection, invariants, recovery, postmortem and interview story obligations.

## AI-assisted delivery

- [`ai/AI_ASSISTED_DEVELOPMENT.md`](ai/AI_ASSISTED_DEVELOPMENT.md) — task packets, tool roles, review, falsification, receipts and productivity measurement.

## Governance and traceability

- [`governance/EVIDENCE_ROUTING.md`](governance/EVIDENCE_ROUTING.md) — GitHub/Sheets/Docs and cross-repository authority.
- [`governance/COMMERCIAL_REPO_ALLOWLIST.md`](governance/COMMERCIAL_REPO_ALLOWLIST.md) — commercial-use engineering screen and license boundaries.
- [`governance/SHADOW_ARCHITECT_LEDGER.md`](governance/SHADOW_ARCHITECT_LEDGER.md) — independent findings, evidence ceiling and current verdict.
- [`../manifests/sources.yaml`](../manifests/sources.yaml) — source authority, dates and exact internal repository pins.
- [`../manifests/stack.yaml`](../manifests/stack.yaml) — selected/deferred stack and implementation evidence state.
- [`../schemas/evidence.schema.json`](../schemas/evidence.schema.json) — exact evidence receipt schema.

## Truthful current ceiling

These documents define a candidate control plane. Until implementation and exact receipts exist, the maximum claim remains:

> A requirement-linked, reviewable architecture and execution plan exists for the Delivery Pulse Full Stack Seed portfolio MVP.
