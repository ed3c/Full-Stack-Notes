package dev.ed3c.fullstacknotes.work.domain;

import java.util.UUID;

public abstract class DomainException extends RuntimeException {
    protected DomainException(String message) {
        super(message);
    }

    public static final class NotFound extends DomainException {
        public NotFound(UUID id) {
            super("work item not found: " + id);
        }
    }

    public static final class IdempotencyConflict extends DomainException {
        public IdempotencyConflict(String key) {
            super("idempotency key was already used for a different request: " + key);
        }
    }

    public static final class VersionConflict extends DomainException {
        public VersionConflict(UUID id, long expectedVersion) {
            super("work item version conflict for " + id + "; expected version " + expectedVersion);
        }
    }

    public static final class InvalidTransition extends DomainException {
        public InvalidTransition(WorkItemStatus status, TransitionAction action) {
            super("invalid transition: " + status + " -> " + action);
        }
    }

    public static final class InvalidRequest extends DomainException {
        public InvalidRequest(String message) {
            super(message);
        }
    }
}
