package dev.ed3c.fullstacknotes.work.application;

import dev.ed3c.fullstacknotes.work.domain.DomainException;
import dev.ed3c.fullstacknotes.work.domain.TransitionAction;
import dev.ed3c.fullstacknotes.work.domain.WorkItem;
import dev.ed3c.fullstacknotes.work.domain.WorkItemStateMachine;
import dev.ed3c.fullstacknotes.work.domain.WorkItemStatus;
import dev.ed3c.fullstacknotes.work.persistence.IdempotencyRepository;
import dev.ed3c.fullstacknotes.work.persistence.WorkItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;

@Service
public final class WorkItemService {
    private static final String CREATE_OPERATION = "createWorkItem";
    private static final String TRANSITION_OPERATION = "transitionWorkItem";

    private final WorkItemRepository workItems;
    private final IdempotencyRepository idempotency;
    private final WorkItemStateMachine stateMachine;
    private final JsonMapper jsonMapper;

    public WorkItemService(
            WorkItemRepository workItems,
            IdempotencyRepository idempotency,
            WorkItemStateMachine stateMachine,
            JsonMapper jsonMapper
    ) {
        this.workItems = workItems;
        this.idempotency = idempotency;
        this.stateMachine = stateMachine;
        this.jsonMapper = jsonMapper;
    }

    @Transactional
    public MutationResult create(String idempotencyKey, CreateCommand command) {
        Objects.requireNonNull(command, "command");
        validateIdempotencyKey(idempotencyKey);

        String title = normalizeTitle(command.title());
        String description = normalizeDescription(command.description());
        String fingerprint = fingerprint(CREATE_OPERATION, title, description);

        return executeIdempotent(
                idempotencyKey,
                CREATE_OPERATION,
                fingerprint,
                () -> {
                    Instant now = Instant.now();
                    WorkItem item = new WorkItem(
                            UUID.randomUUID(),
                            title,
                            description,
                            WorkItemStatus.OPEN,
                            1,
                            now,
                            now
                    );
                    workItems.insert(item);
                    return item;
                }
        );
    }

    @Transactional(readOnly = true)
    public WorkItem get(UUID id) {
        return workItems.findById(id).orElseThrow(() -> new DomainException.NotFound(id));
    }

    @Transactional(readOnly = true)
    public List<WorkItem> list(int limit) {
        if (limit < 1 || limit > 100) {
            throw new DomainException.InvalidRequest("limit must be between 1 and 100");
        }
        return workItems.list(limit);
    }

    @Transactional
    public MutationResult transition(
            String idempotencyKey,
            UUID workItemId,
            long expectedVersion,
            TransitionAction action
    ) {
        validateIdempotencyKey(idempotencyKey);
        if (expectedVersion < 1) {
            throw new DomainException.InvalidRequest("expected version must be at least 1");
        }
        if (action == null) {
            throw new DomainException.InvalidRequest("transition action is required");
        }

        String fingerprint = fingerprint(
                TRANSITION_OPERATION,
                workItemId.toString(),
                Long.toString(expectedVersion),
                action.name()
        );

        return executeIdempotent(
                idempotencyKey,
                TRANSITION_OPERATION,
                fingerprint,
                () -> {
                    WorkItem current = workItems.findById(workItemId)
                            .orElseThrow(() -> new DomainException.NotFound(workItemId));
                    if (current.version() != expectedVersion) {
                        throw new DomainException.VersionConflict(workItemId, expectedVersion);
                    }

                    WorkItemStatus next = stateMachine.apply(current.status(), action);
                    return workItems.updateStatus(workItemId, expectedVersion, next)
                            .orElseThrow(() -> new DomainException.VersionConflict(workItemId, expectedVersion));
                }
        );
    }

    private MutationResult executeIdempotent(
            String key,
            String operation,
            String fingerprint,
            Supplier<WorkItem> mutation
    ) {
        if (!idempotency.reserve(key, operation, fingerprint)) {
            IdempotencyRepository.IdempotencyRecord existing = idempotency.find(key)
                    .orElseThrow(() -> new IllegalStateException("idempotency conflict row disappeared for key " + key));
            if (!operation.equals(existing.operation()) || !fingerprint.equals(existing.fingerprint())) {
                throw new DomainException.IdempotencyConflict(key);
            }
            if (existing.responseJson() == null) {
                throw new IllegalStateException("completed idempotency reservation has no response for key " + key);
            }
            return new MutationResult(readWorkItem(existing.responseJson()), true);
        }

        WorkItem item = mutation.get();
        idempotency.complete(key, writeWorkItem(item));
        return new MutationResult(item, false);
    }

    private String writeWorkItem(WorkItem item) {
        try {
            return jsonMapper.writeValueAsString(item);
        } catch (Exception exception) {
            throw new IllegalStateException("failed to serialize idempotency response", exception);
        }
    }

    private WorkItem readWorkItem(String json) {
        try {
            return jsonMapper.readValue(json, WorkItem.class);
        } catch (Exception exception) {
            throw new IllegalStateException("failed to deserialize idempotency response", exception);
        }
    }

    private static String normalizeTitle(String title) {
        if (title == null) {
            throw new DomainException.InvalidRequest("title is required");
        }
        String normalized = title.trim();
        if (normalized.isEmpty()) {
            throw new DomainException.InvalidRequest("title must not be blank");
        }
        if (normalized.length() > 200) {
            throw new DomainException.InvalidRequest("title must be at most 200 characters");
        }
        return normalized;
    }

    private static String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        if (description.length() > 4000) {
            throw new DomainException.InvalidRequest("description must be at most 4000 characters");
        }
        return description;
    }

    private static void validateIdempotencyKey(String key) {
        if (key == null || key.length() < 8 || key.length() > 128) {
            throw new DomainException.InvalidRequest("Idempotency-Key must be between 8 and 128 characters");
        }
    }

    private static String fingerprint(String... fields) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (String field : fields) {
                byte[] value = field == null ? new byte[]{0} : field.getBytes(StandardCharsets.UTF_8);
                digest.update(intBytes(value.length));
                digest.update(value);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required by the Java runtime", impossible);
        }
    }

    private static byte[] intBytes(int value) {
        return new byte[]{
                (byte) (value >>> 24),
                (byte) (value >>> 16),
                (byte) (value >>> 8),
                (byte) value
        };
    }

    public record CreateCommand(String title, String description) {
    }

    public record MutationResult(WorkItem item, boolean replayed) {
    }
}
