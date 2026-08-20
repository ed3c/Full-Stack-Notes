package dev.ed3c.fullstacknotes.work.messaging;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record WorkItemEvent(
        UUID eventId,
        String eventType,
        int schemaVersion,
        Instant occurredAt,
        UUID aggregateId,
        long aggregateVersion,
        String traceId,
        String requestId,
        String idempotencyKeyHash,
        Map<String, Object> payload
) {
}
