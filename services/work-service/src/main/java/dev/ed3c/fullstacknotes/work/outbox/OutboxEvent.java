package dev.ed3c.fullstacknotes.work.outbox;

import java.time.Instant;
import java.util.UUID;

public record OutboxEvent(
        UUID eventId,
        UUID aggregateId,
        long aggregateVersion,
        String eventType,
        int schemaVersion,
        String topic,
        String partitionKey,
        String traceId,
        String requestId,
        String eventJson,
        int attemptCount,
        Instant createdAt
) {
}
