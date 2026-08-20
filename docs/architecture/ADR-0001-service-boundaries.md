# ADR-0001: Keep product edge, transactional domain, and asynchronous projection as separate ownership boundaries

- Status: Accepted for PR-0 contract foundation
- Scope: Operations Work Queue MVP

## Context

The target role explicitly requires React, Node.js, and a strong Java or Go backend. Putting business logic independently into both Node.js and Java would create an artificial distributed domain and make consistency harder without proving useful skill.

The portfolio also needs a boundary where frontend-facing shaping, server-side domain invariants, and asynchronous eventual consistency can each be tested under failure.

## Decision

Use these ownership boundaries:

- React owns presentation, interaction state, async UI reconciliation, and browser performance behavior.
- Node.js BFF owns edge validation, authentication/session boundary when introduced, request/trace correlation, API shaping, bounded timeout/retry, rate limiting, and graceful process lifecycle.
- Java work-service is the sole owner of work-item domain invariants, idempotent command semantics, optimistic concurrency, relational transactions, persistence, and transactional outbox writes.
- Kafka is a transport for durable asynchronous events, not a second command authority.
- audit-consumer owns an eventually consistent audit/read projection and must be idempotent under redelivery.
- PostgreSQL is the transactional source of truth for command state.

## Consequences

Positive:

- Node and Java both have meaningful responsibilities without duplicated domain truth.
- API/event contracts can be frozen before PR-1/2/3 parallelism.
- consistency semantics can be explained precisely in interviews.
- BFF failure policy can be tested independently from domain correctness.

Negative:

- the MVP has more runtime boundaries than a single-process CRUD app;
- trace propagation and local integration setup become necessary early;
- the BFF must resist accumulating domain behavior merely for convenience.

## Rejected alternatives

### Node.js owns the whole backend

Rejected for this portfolio because it would fail to demonstrate the required deep Java backend lane.

### Java serves the browser directly

Technically simpler, but rejected because it would make the required Node.js proficiency superficial instead of exposing event-loop, edge-policy, and process-lifecycle behavior.

### Multiple domain microservices

Rejected until a real ownership/consistency boundary appears. Extra services would increase deployment and failure surface without stronger evidence.

## Guardrail

If an implementation PR needs to duplicate or move an invariant across these boundaries, it must amend this ADR or create a superseding ADR; it may not silently drift the ownership model.
