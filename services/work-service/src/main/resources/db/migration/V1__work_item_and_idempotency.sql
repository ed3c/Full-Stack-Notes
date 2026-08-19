CREATE TABLE work_item (
    id UUID PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(4000),
    status VARCHAR(32) NOT NULL,
    version BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT work_item_title_not_blank CHECK (length(btrim(title)) > 0),
    CONSTRAINT work_item_status_valid CHECK (status IN ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
    CONSTRAINT work_item_version_positive CHECK (version >= 1)
);

CREATE INDEX work_item_created_at_id_idx
    ON work_item (created_at DESC, id DESC);

CREATE TABLE idempotency_record (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    operation VARCHAR(64) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    response_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT idempotency_key_length CHECK (length(idempotency_key) BETWEEN 8 AND 128),
    CONSTRAINT idempotency_fingerprint_sha256 CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
    CONSTRAINT idempotency_completion_consistent CHECK (
        (response_json IS NULL AND completed_at IS NULL)
        OR (response_json IS NOT NULL AND completed_at IS NOT NULL)
    )
);

CREATE INDEX idempotency_record_created_at_idx
    ON idempotency_record (created_at);
