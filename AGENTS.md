# AGENTS.md

## Mission

Build and maintain `Full-Stack-Notes` as an evidence-first, production-shaped portfolio for a Full Stack Seed Engineer role. Optimize for traceable capability proof, not repository volume or optimistic status prose.

## Canonical read order

Before making a change, read in this order:

1. `README.md` — current integrated-main state, directory ownership, dataflow, evidence ceiling, execution DAG, Stack PR index.
2. this `AGENTS.md` — writer/auditor roles and mutation protocol.
3. the owning GitHub issue and PR for the active node.
4. `docs/stacked-prs/README.md` — semantic parentage and path ownership.
5. relevant ADR/contract/runbook/evidence files.
6. `docs/handoff/LOCAL_HANDOFF_EXECUTION_QUEUE.md` when continuing local execution.

GitHub issues/PRs/commits/checks are canonical. Google Docs/Sheets are projections only.

## Current integrated truth

Main is integrated through PR #33 / issue #21:

- PR #24 / #16 foundation + contracts — merged, `VERIFIED`.
- PR #25 / #17 Java transactional core — merged, `VERIFIED`.
- PR #28 / #18 Node BFF — merged, `VERIFIED` at deterministic single-process scope.
- PR #29 / #19 React work queue — merged, `VERIFIED`.
- PR #32 / #20 transactional outbox + Kafka + audit consumer — merged, `VERIFIED`.
- PR #33 / #21 pinned E2E runtime — merged, `RUNTIME_EVIDENCE` for one deterministic full-stack happy path.
- PR #34 / #22 resilience/load/observability — **draft/open**, `IMPLEMENTED / FALSIFICATION_IN_PROGRESS`, latest exact-head workflow failing.
- #23 final evidence admission — blocked on #22.
- #27 deferred controls — intentionally `DEFERRED / NOT_IMPLEMENTED`.
- #30 release-license review — `REVIEW_REQUIRED / RELEASE-SHAPE-DEPENDENT`.

Do not downgrade merged truth back to `PROPOSED`, and do not upgrade broader capabilities beyond their exact evidence ceiling.

## Non-negotiable truth rules

1. Never label design, mocked behavior, local tests, CI simulations, or generated text as production experience.
2. Evidence states are ordered: `PROPOSED -> CONTRACTED -> IMPLEMENTED -> VERIFIED -> RUNTIME_EVIDENCE -> HUMAN_ADMITTED`.
3. Evidence is claim-scoped. A component can be `VERIFIED` while its load/resilience/production claim remains open.
4. A claim advances only when its required artifact exists at a stable GitHub path or immutable run/artifact receipt.
5. Prose, comments, checklist edits, or a green unrelated check cannot advance evidence state.
6. Real prior work and portfolio simulations remain explicitly separate.
7. `HUMAN_ADMITTED` requires an actual human admission decision for the exact claim; agents cannot manufacture it.
8. GitHub wins any conflict with Google Docs/Sheets projections.

## Writer/auditor model

### Tech Lead controller — sole writer

The Tech Lead may mutate code, docs, issues, PR metadata, and branches. Responsibilities:

- convert requirements into IDs, acceptance criteria, failure semantics, and evidence gates;
- freeze contracts before parallel work;
- build the dependency DAG and assign non-overlapping path ownership;
- reject implementation that lacks tests, failure semantics, observability, or rollback/recovery thinking;
- bind runtime admission to an exact subject head and immutable run/artifact receipt;
- route work to the smallest reviewable Stack PR;
- close/merge only when the scoped evidence gate is satisfied;
- keep unfinished work in issues and the Local Handoff Execution Queue.

### Shadow Architect monitor — read-only

The Shadow Architect never becomes a competing writer. It audits:

- boundary drift and duplicated responsibility;
- hidden coupling and contract erosion;
- missing backpressure, idempotency, consistency, timeout, retry, concurrency, security, and observability behavior;
- stale or inflated README/issue/evidence states;
- unsupported resume/interview claims;
- open loops across requirement -> implementation -> test -> runtime artifact -> review.

Findings are reported to the Tech Lead through issue/PR review records. The Tech Lead owns all resulting mutations.

## Directory ownership and current state

- `packages/contracts/**` — API/event schemas only; `VERIFIED` via PR #24. No business logic.
- `services/work-service/**` — Java domain owner, SQL, idempotency, optimistic concurrency, transactions, outbox; `VERIFIED` through PR #25/#32.
- `apps/bff/**` — Node edge validation/shaping, request correlation, deadlines/retries, local rate limit, graceful shutdown; `VERIFIED` single-process scope through PR #28. No PostgreSQL access or copied Java invariants.
- `apps/web/**` — React presentation/client async-state correctness; `VERIFIED` through PR #29. Talks only to BFF.
- `services/audit-consumer/**` — at-least-once Kafka consumption, duplicate integrity, audit projection/DLT; `VERIFIED` through PR #32.
- `infra/integration/**`, `tests/e2e/**` — pinned deterministic full-stack assembly; `RUNTIME_EVIDENCE` through PR #33 for one happy path.
- `infra/resilience/**`, `tests/failure/**`, `tests/load/**`, resilience observability config — active #22/#34 lane; `IMPLEMENTED / FALSIFICATION_IN_PROGRESS`, not admitted.
- `docs/**` — architecture, evidence, role mapping, handoff, license and DAG truth. Documentation cannot promote runtime state by itself.

## Active frontier: #22 / PR #34

Exact current subject:

- branch: `agent/pr6-resilience-observability`
- head: `62f510759b1a9418c325cad8337a31b8c5f6bd18`
- latest exact-head workflow: `32389681008`
- job: `96492505763`
- artifact: `9414468450`
- artifact digest: `sha256:8ec6bb6968c62a3d77bae8723e037a6edf1f2c437b77bc61b7360b1689f48b67`
- state: draft/open, not merged.

Primary falsification: `work-service-1` cannot complete Flyway startup because the resilience topology applies a two-connection Hikari pool before application bootstrap; both connections are active and Flyway times out waiting for another connection. The test is therefore contaminating startup instead of measuring runtime pool exhaustion/recovery.

Secondary harness defect: `stop_named` assigns `name` and expands it into `pid_file` in the same `local` statement under `set -u`; cleanup can raise `name: unbound variable` and mask the primary failure.

Required next behavior:

1. separate normal startup pool configuration from the runtime F-11 saturation condition;
2. split dependent `local` assignments in cleanup;
3. run the full exact-head workflow against current main parentage;
4. require all #22 drill receipts, telemetry correlation, load metadata, recovery observations, AI-verification receipt, and residual-risk fields;
5. Shadow Architect audits exact receipts;
6. only then mark PR #34 ready, merge, and close #22.

Do not accept a partial rerun, prose-only incident record, or inherited component test as substitute for #22 runtime evidence.

## Canonical DAG

```text
#16 / PR #24  MERGED foundation
   ├── #17 / PR #25  MERGED Java
   ├── #18 / PR #28  MERGED BFF
   └── #19 / PR #29  MERGED React
          ↓
       #20 / PR #32  MERGED outbox/Kafka/audit
          ↓
       #21 / PR #33  MERGED integrated E2E
          ↓
       #22 / PR #34  DRAFT + FAILING resilience/load/observability
          ↓
       #23           BLOCKED evidence admission/interview packet

#27 deferred-control side lane
#30 release-license/SBOM side control
```

Do not resurrect the superseded Delivery Pulse control plane. New requirements must route into the current DAG or be held in #27 with explicit promotion criteria.

## Change protocol

1. Identify the owning capability issue and requirement IDs.
2. Confirm current evidence state from GitHub, not stale prose.
3. Freeze/validate contracts and ADRs if boundaries change.
4. Create the smallest branch/Stack PR with narrow path ownership.
5. Implement executable behavior.
6. Run unit/contract/integration checks relevant to the change.
7. Execute required failure scenario(s), not only happy path.
8. Capture exact-head evidence under a stable run/artifact path.
9. Shadow Architect audits closure read-only.
10. Tech Lead updates canonical docs/issues and merges only if the scoped gate is satisfied.
11. Human reviewer separately admits or rejects interview/experience claims.

## Pull request and merge rules

- Draft by default until automated acceptance is satisfied.
- One semantic concern per stack node.
- Never auto-resolve semantic conflicts in contracts, migrations, domain state machines, or evidence records.
- Do not claim issue closure from code presence alone.
- PR body must state requirement IDs, dependency node, owned paths, behavior changed, failure semantics, checks, exact evidence receipts, known gaps, and evidence ceiling.
- Parent nodes merge before semantically dependent children. After retarget/rebase, confirm child subject bytes and mergeability again.
- A green component workflow does not imply a green integrated/resilience workflow.
- Main merge is not `HUMAN_ADMITTED`.

## Deferred controls (#27)

A deferred checkbox is not an implementation task. Promotion requires:

1. requirement IDs;
2. named user/system outcome;
3. owning paths;
4. failure semantics;
5. acceptance test/runtime receipt;
6. evidence ceiling;
7. dependency position in the canonical DAG.

SSE/SSR/Kubernetes/Valkey/distributed fairness or other product-shape changes require a concrete need and, where architectural, an ADR before implementation.

## Final admission (#23)

#23 cannot manufacture production or organizational experience. It may package only already verified/runtime evidence plus genuine human-supplied prior-work/adoption signals. Every admitted claim must link requirement -> issue/PR -> subject commit -> test/run artifact -> Shadow audit -> human decision.

## Licensing

Repository code is Apache-2.0. Third-party packages/services retain their own licenses. Before adding or releasing a dependency, record license, purpose, replacement cost, and source-disclosure/network-copyleft risk in `docs/stack/THIRD_PARTY_REPO_POLICY.md`.

Issue #30 remains open for release-shape-dependent MPL-2.0 obligations from Vite's transitive `lightningcss`. Functional verification does not close distribution/NOTICE/SBOM obligations.