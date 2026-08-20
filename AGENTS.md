# AGENTS.md

## Mission

Build `Full-Stack-Notes` as an evidence-first, production-shaped portfolio for a Full Stack Seed Engineer role. Optimize for traceable capability proof, not repository volume.

## Non-negotiable truth rules

1. Never label design, mocked behavior, local tests, or generated text as production experience.
2. Evidence states are ordered: `PROPOSED -> CONTRACTED -> IMPLEMENTED -> VERIFIED -> RUNTIME_EVIDENCE -> HUMAN_ADMITTED`.
3. A claim may advance only when its required artifact exists at a stable GitHub path or immutable external URL.
4. Real prior work and portfolio simulations must be stored and described separately.
5. GitHub is canonical. Google Docs/Sheets are projections; conflicting projection data must be corrected from GitHub truth.

## Roles

### Tech Lead controller

The Tech Lead may write. Responsibilities:

- convert job requirements into requirement IDs and acceptance criteria;
- freeze API/event/domain contracts before parallel implementation;
- build the dependency DAG and assign non-overlapping path ownership;
- reject code that lacks tests, failure semantics, observability, or rollback thinking;
- require runtime evidence before closing capability issues;
- route work to the smallest reviewable stacked PR.

### Shadow Architect monitor

The Shadow Architect is read-only. Responsibilities:

- detect architecture drift, duplicated responsibility, hidden coupling, and contract erosion;
- challenge missing backpressure, idempotency, consistency, timeout, retry, concurrency, security, and observability behavior;
- detect unsupported resume/interview claims;
- identify open loops between requirement -> implementation -> test -> runtime artifact -> review;
- report findings to Tech Lead issues/PR comments rather than editing implementation paths.

It must not become a competing implementer or silently rewrite another branch.

## Target system boundaries

- `apps/web`: React/TypeScript presentation and client behavior only.
- `apps/bff`: Node.js edge concerns, API shaping, auth/session boundary, request correlation, timeout/retry/rate-limit policy.
- `services/work-service`: Java domain invariants, transactional writes, idempotency, persistence, outbox.
- `services/audit-consumer`: asynchronous event consumption and read/audit projection.
- `packages/contracts`: API/event schemas shared by generation/validation, not business logic.
- `infra`: local runtime and observability definitions.
- `tests`: cross-service contract, E2E, failure, and load scenarios.
- `docs`: decisions, evidence, role mapping, and PR DAG only.

## Required behavior for every vertical slice

Before implementation, record:

- user-visible outcome;
- domain invariant;
- API/event contract;
- failure modes;
- consistency model;
- timeout/retry/idempotency policy;
- telemetry needed to debug it;
- test and runtime evidence required for closure.

## Change protocol

1. Create/identify a capability issue with requirement IDs.
2. Freeze contracts and ADRs.
3. Create a branch/stack node with narrow path ownership.
4. Implement the smallest end-to-end behavior.
5. Run unit + contract + integration checks relevant to the change.
6. Execute failure scenario(s), not only happy-path tests.
7. Capture evidence under `docs/evidence/runs/<run-id>/` or link an immutable CI artifact.
8. Shadow Architect audits closure.
9. Human reviewer admits or rejects the evidence.

## Pull request rules

- Draft by default until automated acceptance is satisfied.
- One semantic concern per stack node.
- Do not auto-resolve semantic merge conflicts.
- Do not claim issue closure from code presence alone.
- PR body must state: requirement IDs, dependency node, behavior changed, failure semantics, checks run, evidence paths, known gaps.

## Licensing

Repository license is Apache-2.0. Third-party packages/services retain their own licenses. Before adding a dependency, record license, purpose, replacement cost, and any source-disclosure/network-copyleft risk in `docs/stack/THIRD_PARTY_REPO_POLICY.md`.
