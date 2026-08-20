CREATE TABLE outbox_event (
    event_id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_version BIGINT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    schema_version INTEGER NOT NULL,
    topic VARCHAR(128) NOT NULL,
    partition_key VARCHAR(128) NOT NULL,
    trace_id VARCHAR(128) NOT NULL,
    request_id VARCHAR(128),
    event_json JSONB NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(128),
    last_error VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    CONSTRAINT outbox_aggregate_version_positive CHECK (aggregate_version >= 1),
    CONSTRAINT outbox_schema_version_positive CHECK (schema_version >= 1),
    CONSTRAINT outbox_attempt_count_nonnegative CHECK (attempt_count >= 0),
    CONSTRAINT outbox_event_type_valid CHECK (event_type IN ('WorkItemCreated', 'WorkItemTransitioned')),
    CONSTRAINT outbox_lock_consistent CHECK ((locked_at IS NULL) = (locked_by IS NULL)),
    CONSTRAINT outbox_aggregate_version_unique UNIQUE (aggregate_id, aggregate_version)
);

CREATE INDEX outbox_event_pending_available_idx
    ON outbox_event (available_at, created_at, event_id)
    WHERE published_at IS NULL;

CREATE INDEX outbox_event_pending_age_idx
    ON outbox_event (created_at)
    WHERE published_at IS NULL;
