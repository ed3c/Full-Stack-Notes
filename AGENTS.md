# AGENTS.md — Full Stack Notes

This repository is the role-specific implementation and evidence authority for the Delivery Pulse portfolio. It consumes reusable methods from `ed3c/skills-shared` through explicit, pinned references; it does not copy mutable skill bodies or consumer state into shared repositories.

## Mandatory read order

1. root `README.md`
2. `prd/requirements.json`
3. `docs/architecture/README.md`
4. nearest directory `README.md` or `AGENTS.md`
5. exact issue and acceptance criteria
6. exact PR base SHA, head SHA, changed paths, checks, and receipts
7. `docs/governance/SHADOW_ARCHITECT_LEDGER.md` before any closure claim

## Authority boundaries

### Tech Lead controller

Owns:

- requirement extraction and stable `FS-*` identities;
- interface, event, invariant, and acceptance-test freeze;
- capability/task DAG and true dependency edges;
- one writer per file/path and one convergence owner;
- bounded retries, cancellation, cleanup, and Local Handoff items;
- integration of verified bytes and local/global objective checks.

Must not:

- self-certify the global objective;
- treat documentation, fixtures, mocks, or CI as live production evidence;
- create fake child branches when work is path-disjoint;
- invent professional experience, users, traffic, uptime, cost, or adoption;
- broaden secrets, network, provider, merge, release, or visibility authority.

### Independent Shadow Architect monitor

The Shadow is read-only. It reviews the same immutable candidate through a separate evaluation path and emits findings plus a verdict.

Owns:

- applicability and contradiction review;
- local task versus global role-objective review;
- evidence ceiling and denominator review;
- missing owner, issue, control, receipt, rollback, or cleanup discovery;
- forbidden-change and false-promotion detection.

Must not:

- edit implementation paths or become a second state writer;
- reuse the Builder conclusion as independent evidence;
- convert deterministic PASS into runtime, production, or Human Admit;
- resolve semantic conflict, merge, deploy, release, or change visibility;
- persist private reasoning or secrets.

## Evidence vocabulary

Use these values without optimistic normalization:

```text
PASS
FAIL
ABSENT
NOT_IMPLEMENTED
NOT_EXERCISED
SKIPPED_BY_POLICY
BLOCKED_BY_PREDECESSOR
STALE_SUBJECT
CONTRACT_CLOSED
LIVE_CLOSED
PARTIAL
HUMAN_ADMIT_REQUIRED
```

Every receipt must bind:

```text
requirement_id
repository
base_commit
head_commit
artifact_or_command
started_at
finished_at
result
scope_and_evidence_ceiling
cleanup_or_residue
source_links
```

A mutable branch name alone is not an exact subject.

## Data and secret rules

- Never commit credential values, access tokens, cookies, customer/company identifiers, private URLs, device identifiers, or proprietary source material.
- `.env.example` may contain names and safe placeholders only.
- Logs and fixtures must use synthetic identities and redact tokens, authorization headers, email addresses, and free-form user text.
- Public evidence may point to private capability work only through an opaque evidence ID and a truthful disclosure class; do not expose private repository paths or inaccessible URLs as public proof.
- AI prompts and transcripts must be sanitized. Store the public task contract, constraints, model/tool metadata, resulting diff, reviewer findings, and test receipt—not private chain of thought.

## Architecture laws

1. `apps/web` owns product rendering and browser state; it does not own domain truth.
2. `apps/bff` owns the web/session boundary, aggregation, SSE replay, and request budgets; it cannot write PostgreSQL directly.
3. `services/delivery-core` is the only initiative/workflow domain writer.
4. A domain mutation and its outbox event are committed in one PostgreSQL transaction.
5. Consumers are at-least-once; every handler must be idempotent and observable.
6. Kafka ordering is claimed only inside a named partition-key policy.
7. Valkey is cache/control-plane assistance, never business source of truth.
8. Retry requires a bounded budget, timeout, idempotency analysis, and terminal route.
9. A circuit breaker does not replace backpressure, bulkheads, load shedding, or capacity limits.
10. API/event changes require compatibility tests and an explicit migration or versioning decision.
11. Service extraction requires an ADR with measured ownership, scale, availability, or deployment evidence.

## Frontend proof rules

A frontend slice is not closed without applicable evidence for:

- accessible keyboard and screen-reader behavior;
- server/client component boundary and state ownership;
- loading, empty, error, stale, reconnect, and permission states;
- render-count or React Profiler evidence for the changed path;
- bundle and Core Web Vitals budgets where applicable;
- Playwright acceptance tests on desktop and constrained mobile viewport;
- trace/request correlation from browser action to backend result.

## Backend and distributed proof rules

A backend slice is not closed without applicable evidence for:

- transaction and concurrency invariant;
- duplicate, out-of-order, timeout, cancellation, and retry controls;
- queue lag and poison-message terminal handling;
- schema migration forward/rollback or forward-fix decision;
- bounded resource use and load result with a complete denominator;
- trace, metric, and structured-log correlation;
- cleanup and residue check after failure injection.

## AI-assisted change contract

Before asking Cursor, Copilot, Claude Code, Codex, or another agent to modify code, freeze a public task packet:

```text
problem
in_scope
out_of_scope
forbidden_changes
exact_base_subject
owned_paths
interfaces_and_invariants
acceptance_tests
failure_controls
resource_and_retry_budget
required_receipt
```

Generated code is a candidate. Human review and deterministic controls own admission. Preserve at least one rejected or corrected candidate for each major capability so the portfolio proves review judgment rather than prompt fluency alone.

## Branch and PR DAG

Relations:

```text
SIBLING             path-disjoint work from the same admitted base
TRUE_CHILD          consumes named unmerged parent bytes/contracts
CONVERGENCE         one owner integrates verified prerequisites and shared indexes
PROCESS_DEPENDENCY  must occur earlier but does not create Git ancestry
EXTERNAL_EVIDENCE   independent live/performance/security review lane
HISTORICAL          prior admitted or forensic subject; not mutable authority
```

Do not make issue order, checklist order, or reviewer chronology look like a Git child dependency. Draft PRs are the default. Merge, deployment, release, rollback, and portfolio promotion remain Human decisions.

## Required local gates

As implementation appears, the root gate must converge on one bounded command, expected to become:

```bash
./scripts/verify.sh
```

The gate must include format/lint/type checks, unit tests, contract compatibility, integration tests, browser tests, dependency/license policy, secret scan, and generated-artifact freshness. Load, chaos, live cloud, and incident exercises remain separate receipts unless the command actually executes them on an exact environment.
