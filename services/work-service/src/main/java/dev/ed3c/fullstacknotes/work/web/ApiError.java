package dev.ed3c.fullstacknotes.work.web;

import java.util.Map;

public record ApiError(
        String code,
        String message,
        String requestId,
        Map<String, Object> details
) {
}
