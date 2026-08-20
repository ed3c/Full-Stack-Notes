CREATE TABLE audit_event (
    event_id UUID PRIMARY KEY,
    event_hash CHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    schema_version INTEGER NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_version BIGINT NOT NULL,
    trace_id VARCHAR(128) NOT NULL,
    request_id VARCHAR(128),
    event_json JSONB NOT NULL,
    kafka_topic VARCHAR(128) NOT NULL,
    kafka_partition INTEGER NOT NULL,
    kafka_offset BIGINT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT audit_event_hash_sha256 CHECK (event_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT audit_event_schema_version_positive CHECK (schema_version >= 1),
    CONSTRAINT audit_event_aggregate_version_positive CHECK (aggregate_version >= 1),
    CONSTRAINT audit_event_offset_nonnegative CHECK (kafka_offset >= 0)
);

CREATE INDEX audit_event_aggregate_version_idx
    ON audit_event (aggregate_id, aggregate_version);

CREATE INDEX audit_event_received_at_idx
    ON audit_event (received_at);
