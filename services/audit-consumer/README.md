# Audit Consumer

The audit consumer is an eventually-consistent projection owner. It does not own work-item command truth.

## Delivery semantics

- Kafka delivery is treated as **at least once**.
- `audit.audit_event.event_id` is the idempotency key for the projection.
- the same `eventId` + same event content is a safe duplicate.
- the same `eventId` + different content is an integrity error and is not silently accepted.
- the database transaction completes before the record listener returns, so a crash before offset commit can redeliver safely.
- after two retries, poison records are published to `<topic>-dlt` by `DeadLetterPublishingRecoverer`.

No claim is made that PostgreSQL + Kafka form one distributed exactly-once transaction.

## Correlation

`traceId`, `requestId`, `eventId`, aggregate ID/version, Kafka topic/partition/offset, and the original event JSON are persisted. Raw HTTP idempotency keys are never part of the event envelope; only an optional irreversible hash may appear.

## Evidence ceiling

PR-4 deterministic tests can prove durable outbox recovery, duplicate-delivery safety, correlation propagation, and poison-event quarantine. Measured consumer lag, convergence SLOs, multi-broker behavior, partition scaling, and production traffic remain downstream runtime evidence.
