package dev.ed3c.fullstacknotes.work.domain;

import java.time.Instant;
import java.util.UUID;

public record WorkItem(
        UUID id,
        String title,
        String description,
        WorkItemStatus status,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
