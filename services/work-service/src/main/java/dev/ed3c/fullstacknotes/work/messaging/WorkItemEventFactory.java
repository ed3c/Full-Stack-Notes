package dev.ed3c.fullstacknotes.work.messaging;

import dev.ed3c.fullstacknotes.work.domain.TransitionAction;
import dev.ed3c.fullstacknotes.work.domain.WorkItem;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
public final class WorkItemEventFactory {
    public WorkItemEvent created(WorkItem item, String requestId, String idempotencyKey) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("kind", "created");
        payload.put("title", item.title());
        payload.put("status", item.status().name());
        return envelope("WorkItemCreated", item, requestId, idempotencyKey, payload);
    }

    public WorkItemEvent transitioned(
            WorkItem before,
            WorkItem after,
            TransitionAction action,
            String requestId,
            String idempotencyKey
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("kind", "transitioned");
        payload.put("fromStatus", before.status().name());
        payload.put("toStatus", after.status().name());
        payload.put("action", action.name());
        return envelope("WorkItemTransitioned", after, requestId, idempotencyKey, payload);
    }

    private WorkItemEvent envelope(
            String eventType,
            WorkItem item,
            String requestId,
            String idempotencyKey,
            Map<String, Object> payload
    ) {
        String correlation = requestId == null || requestId.isBlank()
                ? "internal-" + UUID.randomUUID()
                : requestId;
        return new WorkItemEvent(
                UUID.randomUUID(),
                eventType,
                1,
                Instant.now(),
                item.id(),
                item.version(),
                correlation,
                correlation,
                sha256(idempotencyKey),
                Map.copyOf(payload)
        );
    }

    static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java runtime", impossible);
        }
    }
}
