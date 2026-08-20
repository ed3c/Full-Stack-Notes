package dev.ed3c.fullstacknotes.audit.persistence;

import dev.ed3c.fullstacknotes.audit.event.AuditEvent;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AuditEventRepository {
    private final JdbcClient jdbc;

    public AuditEventRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public ApplyResult apply(AuditEvent event, String topic, int partition, long offset) {
        int inserted = jdbc.sql("""
                INSERT INTO audit.audit_event (
                    event_id, event_hash, event_type, schema_version, aggregate_id, aggregate_version,
                    trace_id, request_id, event_json, kafka_topic, kafka_partition, kafka_offset
                ) VALUES (
                    :eventId, :eventHash, :eventType, :schemaVersion, :aggregateId, :aggregateVersion,
                    :traceId, :requestId, CAST(:eventJson AS jsonb), :topic, :partition, :offset
                ) ON CONFLICT (event_id) DO NOTHING
                """)
                .param("eventId", event.eventId())
                .param("eventHash", event.contentHash())
                .param("eventType", event.eventType())
                .param("schemaVersion", event.schemaVersion())
                .param("aggregateId", event.aggregateId())
                .param("aggregateVersion", event.aggregateVersion())
                .param("traceId", event.traceId())
                .param("requestId", event.requestId())
                .param("eventJson", event.rawJson())
                .param("topic", topic)
                .param("partition", partition)
                .param("offset", offset)
                .update();
        if (inserted == 1) return ApplyResult.INSERTED;

        String existingHash = jdbc.sql("SELECT event_hash FROM audit.audit_event WHERE event_id = :eventId")
                .param("eventId", event.eventId())
                .query(String.class)
                .single();
        if (!existingHash.equals(event.contentHash())) {
            throw new IllegalStateException("eventId reused with different content: " + event.eventId());
        }
        return ApplyResult.DUPLICATE;
    }

    public enum ApplyResult { INSERTED, DUPLICATE }
}
