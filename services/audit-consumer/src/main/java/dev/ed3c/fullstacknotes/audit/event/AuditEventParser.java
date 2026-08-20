package dev.ed3c.fullstacknotes.audit.event;

import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public final class AuditEventParser {
    private static final Set<String> TYPES = Set.of("WorkItemCreated", "WorkItemTransitioned");

    private final JsonMapper jsonMapper;

    public AuditEventParser(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
    }

    @SuppressWarnings("unchecked")
    public AuditEvent parse(String json) {
        try {
            Map<String, Object> root = jsonMapper.readValue(json, Map.class);
            UUID eventId = UUID.fromString(requiredString(root, "eventId"));
            String eventType = requiredString(root, "eventType");
            if (!TYPES.contains(eventType)) throw new IllegalArgumentException("unsupported eventType: " + eventType);
            int schemaVersion = requiredNumber(root, "schemaVersion").intValue();
            if (schemaVersion != 1) throw new IllegalArgumentException("unsupported schemaVersion: " + schemaVersion);
            Instant occurredAt = Instant.parse(requiredString(root, "occurredAt"));
            UUID aggregateId = UUID.fromString(requiredString(root, "aggregateId"));
            long aggregateVersion = requiredNumber(root, "aggregateVersion").longValue();
            if (aggregateVersion < 1) throw new IllegalArgumentException("aggregateVersion must be positive");
            String traceId = requiredString(root, "traceId");
            if (traceId.isBlank() || traceId.length() > 128) throw new IllegalArgumentException("invalid traceId");
            String requestId = optionalString(root.get("requestId"));
            String idempotencyKeyHash = optionalString(root.get("idempotencyKeyHash"));
            Object payloadObject = root.get("payload");
            if (!(payloadObject instanceof Map<?, ?>)) throw new IllegalArgumentException("payload must be an object");
            Map<String, Object> payload = (Map<String, Object>) payloadObject;
            validatePayload(eventType, payload);
            return new AuditEvent(
                    eventId, eventType, schemaVersion, occurredAt, aggregateId, aggregateVersion,
                    traceId, requestId, idempotencyKeyHash, Map.copyOf(payload), json, sha256(json)
            );
        } catch (RuntimeException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("invalid work-item event", exception);
        }
    }

    private static void validatePayload(String eventType, Map<String, Object> payload) {
        String kind = requiredString(payload, "kind");
        if (eventType.equals("WorkItemCreated") && !kind.equals("created")) {
            throw new IllegalArgumentException("WorkItemCreated payload kind must be created");
        }
        if (eventType.equals("WorkItemTransitioned") && !kind.equals("transitioned")) {
            throw new IllegalArgumentException("WorkItemTransitioned payload kind must be transitioned");
        }
    }

    private static String requiredString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (!(value instanceof String text) || text.isEmpty()) throw new IllegalArgumentException(key + " must be a string");
        return text;
    }

    private static Number requiredNumber(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (!(value instanceof Number number)) throw new IllegalArgumentException(key + " must be numeric");
        return number;
    }

    private static String optionalString(Object value) {
        if (value == null) return null;
        if (!(value instanceof String text)) throw new IllegalArgumentException("optional correlation field must be a string or null");
        return text;
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java runtime", impossible);
        }
    }
}
