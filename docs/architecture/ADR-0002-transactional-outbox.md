# ADR-0002: Use a transactional outbox instead of synchronous database-plus-Kafka dual writes

- Status: Accepted for PR-0 contract foundation
- Scope: Work-item domain events

## Context

A work-item command must commit relational state and eventually publish a durable domain event. A naive sequence such as `commit database -> publish Kafka` can leave committed state without an event when the broker is unavailable. Reversing the order can publish an event for state that later fails to commit.

A distributed transaction across PostgreSQL and Kafka would add coordination complexity that is not justified for this MVP.

## Decision

Write the work-item mutation and an outbox row in the same PostgreSQL transaction. A separate relay publishes pending outbox records to Kafka and records delivery progress using a retry-safe protocol.

The synchronous API returns success after the database transaction commits; broker availability is not required for command success. The system exposes outbox backlog/age so delayed publication is observable.

Consumers assume at-least-once delivery and must handle duplicate `eventId` values idempotently.

## Required properties

- domain row and outbox row commit atomically;
- outbox rows have stable event IDs and aggregate versions;
- relay failures cannot delete an unpublished event;
- relay retry policy is bounded per attempt but durable across process restarts;
- event publication/consumption preserves trace/correlation context;
- consumer projection is idempotent;
- stale/outbox backlog is observable;
- schema evolution remains explicit through `schemaVersion` and compatibility review.

## Consequences

Positive:

- removes the most dangerous database/Kafka dual-write gap;
- broker outage becomes an explicit delayed-publication state rather than lost data;
- failure recovery is testable and explainable;
- enables replay-oriented incident drills.

Negative:

- publication is eventually consistent;
- relay ownership, cleanup, and backlog monitoring are additional concerns;
- exact-once end-to-end semantics are not claimed; application idempotency remains required.

## Rejected alternatives

### Publish synchronously after DB commit

Rejected because broker failure can leave permanent divergence without a durable retry record.

### Publish before DB commit

Rejected because consumers may observe an event for a command that never commits.

### Distributed/XA transaction

Rejected because it adds coordination and operational complexity disproportionate to the product requirement and still would not remove the need for idempotent consumers.

## Verification route

Issue #20 / PR-4 must execute F-02 (broker unavailable after command commit) and F-03 (duplicate Kafka delivery). The ADR is not considered runtime-proven until those recovery artifacts exist.
