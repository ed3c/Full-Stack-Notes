package dev.ed3c.fullstacknotes.audit.event;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AuditEvent(
        UUID eventId,
        String eventType,
        int schemaVersion,
        Instant occurredAt,
        UUID aggregateId,
        long aggregateVersion,
        String traceId,
        String requestId,
        String idempotencyKeyHash,
        Map<String, Object> payload,
        String rawJson,
        String contentHash
) {
}
