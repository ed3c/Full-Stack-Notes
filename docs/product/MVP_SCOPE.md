# Delivery Pulse MVP Product Contract

## Problem

Cross-team delivery often fails between functions rather than inside one codebase: ambiguous acceptance criteria, hidden handoffs, stale ownership, asynchronous lag, and recovery actions that are not tied back to the original decision.

Delivery Pulse makes those boundaries visible and testable. It is a portfolio product, but its requirements are shaped like a production product: explicit users, invariants, failure states, SLO candidates, telemetry, rollback, and iteration evidence.

## Primary persona

**Product delivery owner** — an engineer, product manager, designer, or operations lead responsible for moving one initiative across team boundaries without losing acceptance constraints or recovery context.

Secondary personas:

- receiving owner who accepts or rejects a handoff;
- engineering lead who investigates risk and blocked transitions;
- operator who diagnoses async lag or dependency failure;
- reviewer who audits how AI-assisted changes were specified and verified.

## Core user outcome

> I can see what an initiative promises, who owns the next boundary, whether the system accepted the transition, how stale each projection is, and what evidence exists when delivery fails.

## MVP user journey

1. User creates an initiative with title, description, acceptance constraints, owner and due time.
2. User sees the initiative in a server-rendered list and opens its audit timeline.
3. User submits a transition with an idempotency key and expected version.
4. The system accepts one valid transition or returns a typed validation, authorization, version or overload result.
5. A durable event updates the risk projection asynchronously.
6. The browser receives the update through SSE; reconnect resumes from a cursor without a duplicate visible transition.
7. User can inspect state version, projection version, trace ID and failure/recovery status.
8. An operator can inject a named fault, observe detection/mitigation/recovery, and attach a postmortem receipt.

## Workflow

Initial states are fixed to keep the vertical slice testable:

```text
DRAFT
  → READY
  → IN_PROGRESS
  → HANDOFF_PENDING
  → DONE

Any non-terminal state
  → BLOCKED
BLOCKED
  → previous admitted state
```

Rules:

- transition graph is versioned and server-authoritative;
- `DONE` requires every required acceptance constraint to be marked satisfied with evidence;
- `HANDOFF_PENDING` requires a receiving owner and due time;
- only the receiving owner or authorized lead may accept the handoff;
- stale `expectedVersion` returns a conflict with current version and state;
- same idempotency key + same request returns the original result;
- same idempotency key + different request returns a conflict;
- risk projection may lag, but it must expose its source aggregate version.

## Product states that must be designed

```text
initial loading
empty list
partial server response
stale projection
optimistic action pending
version conflict
validation failure
authorization failure
rate limited / overloaded
SSE connecting
SSE live
SSE reconnecting
SSE replaying
SSE terminal failure
offline browser
backend unavailable
async projection delayed
poison event isolated
```

A happy-path screenshot is not sufficient product evidence.

## MVP API surface

```text
POST   /v1/initiatives
GET    /v1/initiatives
GET    /v1/initiatives/{initiativeId}
POST   /v1/initiatives/{initiativeId}/transitions
GET    /v1/initiatives/{initiativeId}/timeline
GET    /v1/initiatives/{initiativeId}/risk
GET    /v1/stream?cursor={cursor}
GET    /health/live
GET    /health/ready
```

The BFF may expose a web-shaped resource, but canonical command/event contracts remain versioned under `contracts/`.

## Acceptance scenarios

### A1 — create and observe

```gherkin
Given an authorized tenant user
When the user creates a valid initiative with an idempotency key
Then one initiative is committed
And one audit transition is present
And one outbox event exists in the same transaction
And repeating the request returns the same result without another initiative
```

### A2 — concurrent transition

```gherkin
Given initiative version 4 in READY
When two actors submit different transitions with expected version 4 concurrently
Then exactly one valid transition advances the aggregate
And the other receives a typed version conflict
And no duplicate outbox or audit version exists
```

### A3 — asynchronous projection

```gherkin
Given a committed initiative event
When the consumer receives the event twice
Then the projection changes at most once
And the inbox records one processed event
And the projection exposes the source aggregate version
```

### A4 — reconnect and replay

```gherkin
Given the browser last observed cursor C
And events C+1 through C+3 were published while disconnected
When the browser reconnects with cursor C
Then the missing updates are replayed in order for that cursor contract
And no timeline row is visibly duplicated
```

### A5 — dependency failure

```gherkin
Given PostgreSQL latency exceeds the command deadline
When a transition is submitted
Then the request terminates inside the declared budget
And no success is fabricated
And the trace identifies the dependency wait
And retries remain inside the admitted budget
And cleanup shows no leaked connection or open request
```

### A6 — poison event

```gherkin
Given an event that passes transport decoding but violates a semantic invariant
When bounded retries are exhausted
Then the event is routed to the terminal topic
And consumer progress for unrelated initiatives continues
And the replay runbook requires correction and approval before reprocessing
```

### A7 — frontend performance

```gherkin
Given 500 synthetic initiatives and a constrained browser profile
When one unchanged row receives unrelated stream updates
Then that row does not re-render
And the target interaction remains inside the declared frame budget
And the result is attached to the exact commit and scenario
```

## Product metrics

These metrics describe the product hypothesis; they are not current usage claims:

- time from initiative creation to first accepted owner;
- handoff wait time;
- blocked duration;
- version-conflict rate;
- invalid-transition rate;
- risk-projection freshness;
- SSE reconnect/replay success rate;
- operator mean time to detect and recover in game-days;
- change lead time and escaped-defect rate for AI-assisted versus manual slices.

## Release slices

### Slice 0 — contracts and proof harness

- requirements, OpenAPI/event schemas, architecture, CI skeleton;
- PostgreSQL migration and test environment;
- no product-completion claim.

### Slice 1 — synchronous vertical slice

- React create/list/detail;
- Fastify BFF;
- Java create/transition/timeline;
- PostgreSQL transactions, idempotency and concurrency test;
- browser E2E trace.

### Slice 2 — asynchronous closure

- outbox relay, Kafka, inbox, risk projection and SSE replay;
- duplicate/out-of-order/poison controls;
- lag and freshness telemetry.

### Slice 3 — production-shaped proof

- load profile, frame/bundle budgets, dependency fault injection;
- alert/runbook, rollback/forward-fix, postmortem;
- immutable deployment and live receipt.

### Slice 4 — seed/multiplier proof

- zero-context contributor task;
- AI-assisted packet and reviewer exercise;
- measured workflow improvement and teaching artifact.

## Definition of MVP-ready

`MVP_READY_FOR_REVIEW` requires all of the following:

```text
one complete user journey runs against real PostgreSQL and Kafka
contract, integration and browser gates pass on the exact head
concurrency, duplicate, stale, timeout and poison controls pass
frontend accessibility and performance budgets have exact receipts
trace correlation spans browser → BFF → core → database/outbox → Kafka → worker → SSE
one immutable deployment and rollback/forward-fix exercise exists
critical Shadow findings are closed or explicitly owned
human reviewer admits the claims and their evidence class
```

A locally rendered page or green unit-test suite alone does not meet this definition.
