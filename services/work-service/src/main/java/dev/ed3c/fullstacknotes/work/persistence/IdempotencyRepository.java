package dev.ed3c.fullstacknotes.work.persistence;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public final class IdempotencyRepository {
    private final JdbcClient jdbc;

    public IdempotencyRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public boolean reserve(String key, String operation, String fingerprint) {
        int rows = jdbc.sql("""
                        INSERT INTO idempotency_record(idempotency_key, operation, request_fingerprint, response_json)
                        VALUES (:key, :operation, :fingerprint, NULL)
                        ON CONFLICT (idempotency_key) DO NOTHING
                        """)
                .param("key", key)
                .param("operation", operation)
                .param("fingerprint", fingerprint)
                .update();
        return rows == 1;
    }

    public Optional<IdempotencyRecord> find(String key) {
        return jdbc.sql("""
                        SELECT idempotency_key, operation, request_fingerprint, response_json::text AS response_json
                        FROM idempotency_record
                        WHERE idempotency_key = :key
                        """)
                .param("key", key)
                .query((rs, rowNum) -> new IdempotencyRecord(
                        rs.getString("idempotency_key"),
                        rs.getString("operation"),
                        rs.getString("request_fingerprint"),
                        rs.getString("response_json")
                ))
                .optional();
    }

    public void complete(String key, String responseJson) {
        int rows = jdbc.sql("""
                        UPDATE idempotency_record
                        SET response_json = CAST(:responseJson AS jsonb)
                        WHERE idempotency_key = :key AND response_json IS NULL
                        """)
                .param("responseJson", responseJson)
                .param("key", key)
                .update();
        if (rows != 1) {
            throw new IllegalStateException("idempotency reservation was not completed exactly once for key " + key);
        }
    }

    public record IdempotencyRecord(
            String key,
            String operation,
            String fingerprint,
            String responseJson
    ) {
    }
}
