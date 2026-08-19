# System Design Interview Map — Full Stack Seed Engineer

Use Delivery Pulse as one coherent case, then vary scale, failure and product constraints. The goal is not to recite components; it is to preserve user promises while making trade-offs explicit.

## 60-minute structure

```text
0–5     clarify user, workflow, scope and success
5–10    non-functional requirements and scale envelope
10–15   APIs, events and data model
15–25   high-level architecture and authority boundaries
25–35   consistency, concurrency and asynchronous failure
35–43   frontend rendering/state/performance
43–50   resilience, observability and operations
50–56   security, tenancy, deployment and migration
56–60   bottlenecks, alternatives, rollout and recap
```

## Opening questions

### Product

- Who creates and who accepts a handoff?
- What must be synchronous before the UI may show success?
- Is risk advisory or business-authoritative?
- What stale state is acceptable and how must it be shown?
- Which actions require audit or approval?
- What is the first narrow workflow rather than a generic workflow engine?

### Scale and SLO

- tenants, active users, initiatives per tenant;
- command/query ratio and peak burst;
- concurrent SSE connections;
- event size/rate and retention;
- availability and latency target;
- projection freshness target;
- RPO/RTO and regional requirements;
- compliance, data residency and deletion obligations.

State assumptions numerically and mark them as assumptions. Do not infer global scale from a vague prompt.

## Core answer thesis

> I would start with one Java domain owner backed by PostgreSQL, a Node.js web boundary, a React product surface, and Kafka only for the risk/projection path that can be eventually consistent. I would keep aggregate mutation and outbox emission atomic, make consumers idempotent, expose projection version/staleness, and add service extraction only after ownership or scale evidence justifies it.

## API discussion

Explain:

- idempotency key on create/transition commands;
- expected aggregate version / conditional update;
- typed validation, authorization, conflict, overload and timeout errors;
- cursor-based pagination and SSE replay;
- request deadline and trace context;
- compatibility/versioning strategy.

Avoid:

- success before promised durability;
- retries without idempotency analysis;
- a generic `PATCH state` that bypasses workflow rules;
- leaking database entities as public API contracts.

## Data modelling discussion

Cover:

- tenant-scoped initiative aggregate;
- append-only transition audit;
- optimistic `version` and unique aggregate-version constraint;
- idempotency record and payload hash;
- transactionally written outbox;
- consumer inbox/deduplication;
- read/risk projection with source version;
- indexes based on query/access paths;
- expand/contract migrations and restore/reconciliation.

Ask where strong consistency is actually required. Risk projection and live UI update do not need to block the command transaction.

## Concurrency deep-dive

### Java threading model

- virtual thread per blocking request/task;
- database pool and downstream resources remain bounded;
- deadlines and cancellation propagate;
- avoid long blocking under synchronized monitors;
- lock only a named critical section;
- measure contention, pinning and pool saturation.

### Race example

Two users transition version 4 concurrently:

```text
both read READY / v4
A conditional update succeeds: WHERE id=? AND version=4
B update affects 0 rows
A writes audit/outbox in same transaction
B receives 409 with current state/version
```

Discuss when a row lock/advisory lock is necessary and why a global application lock fails across instances.

## Kafka and eventual-consistency deep-dive

Cover:

- event key = `initiativeId` for per-initiative order;
- outbox closes database/Kafka dual-write gap;
- relay can publish more than once;
- consumer inbox and source version prevent duplicate/regression;
- bounded retries and terminal topic;
- lag/freshness metrics, replay and rebuild;
- schema compatibility and versioning;
- rebalance and backpressure.

Say explicitly:

> I would not claim exactly-once business semantics merely because a broker offers transactions. The business operation crosses the database, broker, consumer database and UI, so I design idempotent effects and reconciliation.

## Distributed-system primitives

### Service discovery and load balancing

- platform DNS/endpoints discover healthy instances;
- readiness protects migrations/warm-up/dependency state;
- L7 load balancing for HTTP; Kafka group coordination for consumers;
- graceful drain and idempotent retry for instance loss;
- avoid sticky sessions unless a stateful constraint proves it.

### Circuit breaker

- per operation/dependency;
- opens only after minimum meaningful sample;
- half-open probes bounded;
- never substitutes for deadlines, capacity, bulkhead or load shedding;
- fallback shows staleness and never fabricates write success.

### Rate limiting

- tenant token bucket plus global overload gate;
- separate command, query and SSE budgets;
- return typed 429 and retry guidance;
- fairness and noisy-neighbour test.

### Backpressure

- bounded request body, queue, in-flight work and Kafka poll batch;
- reject early rather than create unbounded latency;
- monitor queue depth, oldest age, pool wait and event-loop delay.

## Frontend architecture deep-dive

### Component boundary

- product composites encode workflow meaning;
- primitives are reused only after stable pressure appears;
- avoid one universal component with many booleans;
- server/client boundary follows data and interaction needs.

### State strategy

```text
URL state        filters/navigation
server state     initiative/risk snapshots with versions
local state      form and interaction
stream state     connection/cursor/replay/stale state
```

Explain how optimistic UI reconciles on a version conflict and how duplicate SSE events are deduplicated.

### Rendering and performance

- server-render initial shell/list when useful;
- stream independent slow projection;
- client components only where interaction/live APIs require them;
- measure route bundles, hydration, render counts, long tasks and Web Vitals;
- target smooth interaction with a frame budget, then calibrate on a declared device/workload;
- correlate browser interaction with backend trace.

## Production and operations deep-dive

Cover:

- liveness versus readiness;
- immutable image and environment configuration;
- migration sequencing and compatibility window;
- canary/rolling rollout and rollback/forward-fix decision;
- OpenTelemetry trace/metric/log correlation;
- SLO-based alert with runbook;
- capacity and cost limits;
- backup/restore drill;
- game-day and postmortem;
- residue checks for queue, schema, connections and stale clients.

An interview-strength answer includes what happens when rollback is unsafe because the new version already wrote irreversible data.

## AI-assisted engineering discussion

Explain the workflow as a control system:

```text
human freezes requirement/invariant
→ tool receives bounded context and path lease
→ candidate diff
→ deterministic + mutation controls
→ human review
→ independent Shadow review
→ runtime proof
→ human admission
```

Examples of AI errors worth discussing:

- retrying a non-idempotent write;
- authorizing only at the BFF;
- direct database access from Node BFF;
- unbounded `Promise.all` or Java parallelism;
- mock-only tests;
- secret/body logging;
- dual-authoritative React state;
- false completion claim from CI.

## Trade-off questions and strong direction

### Why Java rather than Go?

The role accepts either. Java maximizes transfer from JVM experience and exposes virtual threads, database transactions, locks, Spring operations and Kafka integration. Adding Go without a distinct measured need reduces depth.

### Why Node BFF if Next.js can run server code?

A separate BFF makes Node.js boundary and SSE/resource management explicit, but it adds a hop. Treat it as a hypothesis: compare an integrated Next edge after Slice 1 and keep the BFF only if session ownership, independent scaling, contract isolation or operations justify it.

### Why Kafka for an MVP?

The job explicitly values message queues and eventual consistency. Kafka is admitted only for a real asynchronous risk/projection flow with outbox, idempotency, lag, poison and replay proof—not as an architecture decoration.

### Why not microservices/Kubernetes first?

They add failure modes before the product invariant is proven. Start with a modular domain owner plus explicit edges, then exercise multi-instance discovery/load balancing in a bounded Phase 2.

### Why SSE rather than WebSockets?

The first need is server-to-client updates and replay, not bidirectional realtime collaboration. SSE has a simpler HTTP operating model; WebSockets become an ADR only when bidirectional semantics require them.

## Failure-story follow-ups

Prepare concrete answers for:

1. stale/concurrent write;
2. duplicate message;
3. poison event;
4. database saturation/deadlock;
5. retry storm/circuit breaker;
6. Node event-loop or SSE leak;
7. React stale-state/performance regression;
8. migration rollback/forward-fix;
9. cross-tenant authorization defect;
10. AI-generated defect caught before admission.

For each, state whether the story is `PROFESSIONAL`, `PORTFOLIO_LIVE`, or `PORTFOLIO_DETERMINISTIC`.

## Closing summary skeleton

```text
The domain write is strongly consistent in PostgreSQL and emits an outbox event atomically.
The risk projection and browser update are eventually consistent and expose their source version.
Java owns domain correctness; Node owns the web boundary; React owns user interaction and rendering.
Every remote/async boundary has deadlines, bounded resources, idempotency, telemetry and failure controls.
I would ship one vertical slice, measure it, run failure/rollback exercises, then split or scale only where evidence requires it.
```
