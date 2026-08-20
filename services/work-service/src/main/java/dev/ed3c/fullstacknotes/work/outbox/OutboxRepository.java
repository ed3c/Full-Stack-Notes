package dev.ed3c.fullstacknotes.work.outbox;

import dev.ed3c.fullstacknotes.work.messaging.WorkItemEvent;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class OutboxRepository {
    private final JdbcClient jdbc;
    private final JsonMapper jsonMapper;

    public OutboxRepository(JdbcClient jdbc, JsonMapper jsonMapper) {
        this.jdbc = jdbc;
        this.jsonMapper = jsonMapper;
    }

    public void insert(WorkItemEvent event, String topic) {
        jdbc.sql("""
                INSERT INTO outbox_event (
                    event_id, aggregate_id, aggregate_version, event_type, schema_version,
                    topic, partition_key, trace_id, request_id, event_json
                ) VALUES (
                    :eventId, :aggregateId, :aggregateVersion, :eventType, :schemaVersion,
                    :topic, :partitionKey, :traceId, :requestId, CAST(:eventJson AS jsonb)
                )
                """)
                .param("eventId", event.eventId())
                .param("aggregateId", event.aggregateId())
                .param("aggregateVersion", event.aggregateVersion())
                .param("eventType", event.eventType())
                .param("schemaVersion", event.schemaVersion())
                .param("topic", topic)
                .param("partitionKey", event.aggregateId().toString())
                .param("traceId", event.traceId())
                .param("requestId", event.requestId())
                .param("eventJson", serialize(event))
                .update();
    }

    @Transactional
    public List<OutboxEvent> claimBatch(String workerId, int limit, Duration lease) {
        return jdbc.sql("""
                WITH candidate AS (
                    SELECT event_id
                    FROM outbox_event
                    WHERE published_at IS NULL
                      AND available_at <= now()
                      AND (locked_at IS NULL OR locked_at < now() - (:leaseSeconds * interval '1 second'))
                    ORDER BY created_at, event_id
                    FOR UPDATE SKIP LOCKED
                    LIMIT :limit
                )
                UPDATE outbox_event o
                SET locked_at = now(),
                    locked_by = :workerId,
                    attempt_count = attempt_count + 1
                FROM candidate c
                WHERE o.event_id = c.event_id
                RETURNING o.event_id, o.aggregate_id, o.aggregate_version, o.event_type,
                          o.schema_version, o.topic, o.partition_key, o.trace_id, o.request_id,
                          o.event_json::text AS event_json, o.attempt_count, o.created_at
                """)
                .param("leaseSeconds", lease.toSeconds())
                .param("limit", limit)
                .param("workerId", workerId)
                .query(this::mapEvent)
                .list();
    }

    public boolean markPublished(UUID eventId, String workerId) {
        return jdbc.sql("""
                UPDATE outbox_event
                SET published_at = now(), locked_at = NULL, locked_by = NULL, last_error = NULL
                WHERE event_id = :eventId AND locked_by = :workerId AND published_at IS NULL
                """)
                .param("eventId", eventId)
                .param("workerId", workerId)
                .update() == 1;
    }

    public boolean releaseFailure(UUID eventId, String workerId, Duration delay, String error) {
        String message = error == null ? "unknown publish failure" : error;
        if (message.length() > 2000) {
            message = message.substring(0, 2000);
        }
        return jdbc.sql("""
                UPDATE outbox_event
                SET available_at = now() + (:delayMs * interval '1 millisecond'),
                    locked_at = NULL,
                    locked_by = NULL,
                    last_error = :error
                WHERE event_id = :eventId AND locked_by = :workerId AND published_at IS NULL
                """)
                .param("delayMs", delay.toMillis())
                .param("error", message)
                .param("eventId", eventId)
                .param("workerId", workerId)
                .update() == 1;
    }

    public PendingSnapshot pendingSnapshot() {
        return jdbc.sql("""
                SELECT count(*) AS pending_count,
                       COALESCE(EXTRACT(EPOCH FROM (now() - min(created_at))), 0) AS oldest_age_seconds
                FROM outbox_event
                WHERE published_at IS NULL
                """)
                .query((rs, rowNum) -> new PendingSnapshot(
                        rs.getLong("pending_count"),
                        rs.getDouble("oldest_age_seconds")
                ))
                .single();
    }

    private OutboxEvent mapEvent(ResultSet rs, int rowNum) throws SQLException {
        return new OutboxEvent(
                rs.getObject("event_id", UUID.class),
                rs.getObject("aggregate_id", UUID.class),
                rs.getLong("aggregate_version"),
                rs.getString("event_type"),
                rs.getInt("schema_version"),
                rs.getString("topic"),
                rs.getString("partition_key"),
                rs.getString("trace_id"),
                rs.getString("request_id"),
                rs.getString("event_json"),
                rs.getInt("attempt_count"),
                rs.getObject("created_at", OffsetDateTime.class).toInstant()
        );
    }

    private String serialize(WorkItemEvent event) {
        try {
            return jsonMapper.writeValueAsString(event);
        } catch (Exception exception) {
            throw new IllegalStateException("failed to serialize outbox event", exception);
        }
    }

    public record PendingSnapshot(long pendingCount, double oldestAgeSeconds) {
    }
}
