# Governed AI-Assisted Development

The hiring signal is not that an engineer can open Cursor, Copilot, Claude Code, Codex, or another agent. The signal is that the engineer can turn ambiguity into a bounded contract, give the tool enough context, detect incorrect output, preserve system invariants, and improve the workflow for other engineers.

## State Machine

```text
PRODUCT_PROBLEM
→ HUMAN_REQUIREMENT_BOUND
→ EXACT_BASE_BOUND
→ INTERFACES_AND_INVARIANTS_FROZEN
→ CONTEXT_PACKET_ASSEMBLED
→ AI_CANDIDATE_GENERATED
→ STATIC_AND_DETERMINISTIC_GATES
→ HUMAN_TECHNICAL_REVIEW
→ INDEPENDENT_SHADOW_REVIEW
→ CORRECTION_OR_REJECTION
→ INTEGRATION_AND_RUNTIME_PROOF
→ HUMAN_ADMIT
→ PROMPT_AND_METHOD_RETROSPECTIVE
```

The AI tool never owns `HUMAN_REQUIREMENT_BOUND`, semantic conflict resolution, merge, deploy, release, secret access, or claim promotion.

## Public task packet

Each AI-assisted work item records a sanitized packet:

```yaml
task_id: FS-TASK-...
requirement_ids: [FS-...]
repository: ed3c/Full-Stack-Notes
base_commit: exact-sha
owned_paths:
  - exact/path/**
problem: user/system failure or outcome
in_scope:
  - bounded deliverable
out_of_scope:
  - explicit exclusions
forbidden_changes:
  - authority/security/schema/visibility changes
interfaces:
  - OpenAPI/event/schema identifiers
invariants:
  - correctness and resource laws
acceptance_tests:
  - executable positive controls
negative_controls:
  - duplicate/stale/authz/timeout/mutation cases
resource_budget:
  - deadline, concurrency, payload and retry limits
evidence_required:
  - commands, artifacts, runtime lane and cleanup
handoff_on:
  - semantic conflict, missing credential/runtime, failing predecessor
```

Do not store private chain of thought. Store requirements, tool-visible context, decisions, diffs, findings, tests and receipts.

## Tool roles

| Tool mode | Good use | Required guardrail |
|---|---|---|
| inline completion | local syntax, repetitive mappings, test table expansion | small diff and normal code review |
| conversational editor | bounded component/service implementation | exact owned paths and acceptance tests |
| repository agent | multi-file contract-preserving slice | base/head identity, task DAG, leases, cleanup |
| review agent | find defects, missing tests and boundary violations | independent prompt/context; no reuse of Builder verdict |
| research agent | compare official docs/releases/licenses | source date, primary source, applicability and pin |
| deployment/operator agent | bounded fixed workload only | no generic shell, secret values, merge/release or visibility authority |

## Context strategy

Give the model the smallest complete context, not the largest repository dump:

```text
requirement IDs
+ nearest AGENTS/README
+ frozen API/event schema
+ relevant domain types
+ existing tests and known failing scenario
+ explicit forbidden boundaries
+ exact output/receipt contract
```

Context is rejected when it is stale, contradictory, inaccessible to the reviewer, or wider than the task lease.

## Human review checklist

### Correctness

- Which invariant does each mutation preserve?
- What happens on duplicate, stale, concurrent and reordered input?
- Does the transaction or state boundary match the architecture?
- Is success returned only after the promised durability point?

### Concurrency and resources

- Is concurrency bounded at the scarce resource?
- Are deadlines/cancellation propagated?
- Can retries duplicate effects or amplify overload?
- Are connections, streams, listeners, timers and leases cleaned up?

### Security and tenancy

- Is authorization enforced at the domain boundary?
- Is every query scoped to the tenant?
- Are payloads validated and bounded?
- Can logs/traces expose tokens, PII or private prompts?

### Frontend

- Is there one owner for each state class?
- Are loading, stale, error, reconnect and permission states explicit?
- Does the change introduce avoidable renders, hydration risk or bundle growth?
- Are keyboard, focus, screen-reader and reduced-motion paths valid?

### Distributed system

- Is ordering scope named rather than implied globally?
- Is consumer processing idempotent?
- Is the outbox/inbox or alternative partial-failure window closed?
- Are lag, terminal failure, replay and reconciliation observable?

### Operations

- Are health/readiness, migration, rollout and rollback effects explicit?
- Does telemetry preserve trace correlation?
- Is failure injection paired with recovery and residue evidence?
- Does the change alter license, image, secret or provider boundaries?

## Falsification before admission

Each major AI-generated capability needs at least one control designed to fail a plausible weak implementation.

Examples:

```text
AI adds generic retry
  → duplicate-command mutation must fail

AI authorizes only in BFF
  → direct-core cross-tenant test must fail

AI tests only mocks
  → Testcontainers/real-boundary mutation must fail

AI duplicates entity state in React
  → stale SSE/reconnect scenario must fail

AI claims async completion after DB commit
  → delayed Kafka projection scenario must expose staleness

AI catches timeout and returns 200
  → planted dependency timeout must fail the success invariant
```

A green test suite without a falsifier can be hollow.

## Candidate comparison

Use multiple candidates only when the output contract is locked and comparison is meaningful. Keep the same base, context, tests and budget.

Compare:

```text
correctness gates
negative/mutation controls
complexity and boundary fit
performance/resource result
security and license findings
review effort and correction count
cleanup/residue
```

Do not select by prose confidence, line count, apparent sophistication, or self-reported completion.

## AI evidence receipt

```yaml
receipt_id: AI-REC-...
task_id: FS-TASK-...
tool: cursor | copilot | claude-code | codex | other
model_or_mode: public product/model label when permitted
base_commit: exact-sha
head_commit: exact-sha
prompt_packet_path: evidence/ai-assisted/...
changed_paths: []
forbidden_delta_present: false
checks:
  deterministic: PASS | FAIL
  mutation: PASS | FAIL | NOT_EXERCISED
  integration: PASS | FAIL | NOT_EXERCISED
  runtime: PASS | FAIL | NOT_EXERCISED
review_findings:
  accepted: []
  corrected: []
  rejected: []
cleanup: PASS | FAIL | NOT_APPLICABLE
human_admit: REQUIRED | ADMITTED | REJECTED
```

## Productivity measurement

Do not claim productivity improvement from token count, generated lines, elapsed agent time alone, or one successful demo.

Use matched work where possible:

```text
same task contract and baseline
manual or previous-method treatment
versus AI-assisted treatment

measure:
  lead time to admitted change
  reviewer minutes
  escaped defects
  mutation-control survival
  rework commits
  test/runtime coverage
  operational residue
```

Record the complete denominator, failed attempts and setup costs. A workflow that writes code faster but increases review/recovery cost is not an improvement.

## Seed/multiplier proof

To prove organization-scale value, create one zero-context contributor exercise:

1. another engineer or fresh agent reads `AGENTS.md` and one issue;
2. it produces a candidate inside leased paths;
3. deterministic controls catch a planted defect or confirm the invariant;
4. the contributor can explain why a candidate was admitted or rejected;
5. feedback results in a smaller/clearer task packet or stronger guardrail.

The output is a method improvement, not a claim that an organization has adopted it.

## Example compact prompt packet

```text
Implement FS-BE-003 for initiative transitions.

Base: <exact SHA>
Own only: services/delivery-core/** and its tests.
Do not change OpenAPI/event schemas, auth policy, deployment, repository settings or other apps.

Invariant:
- exactly one transition may consume expectedVersion N;
- duplicate idempotency key + same hash returns the stored result;
- duplicate key + different hash returns 409;
- aggregate, audit and outbox commit atomically.

Acceptance:
- concurrent integration test with real PostgreSQL;
- duplicate and payload-conflict controls;
- no unbounded retry; deadline/cancellation preserved;
- attach commands and exact result receipt.

Stop and hand off on schema contradiction, missing predecessor contract or required secret/runtime.
```

## Current status

```text
task packet contract       DEFINED
agent path/authority law   DEFINED
AI candidate evidence      NOT_EXERCISED
rejected candidate proof   NOT_EXERCISED
matched productivity test  NOT_EXERCISED
seed contributor exercise  NOT_EXERCISED
```
