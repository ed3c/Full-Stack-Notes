package dev.ed3c.fullstacknotes.work.web;

import dev.ed3c.fullstacknotes.work.application.WorkItemService;
import dev.ed3c.fullstacknotes.work.domain.DomainException;
import dev.ed3c.fullstacknotes.work.domain.TransitionAction;
import dev.ed3c.fullstacknotes.work.domain.WorkItem;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/work-items")
public final class WorkItemController {
    private final WorkItemService service;

    public WorkItemController(WorkItemService service) {
        this.service = service;
    }

    @GetMapping
    public WorkItemListResponse list(@RequestParam(defaultValue = "50") int limit) {
        return new WorkItemListResponse(service.list(limit));
    }

    @GetMapping("/{workItemId}")
    public WorkItem get(@PathVariable UUID workItemId) {
        return service.get(workItemId);
    }

    @PostMapping
    public ResponseEntity<WorkItem> create(
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestBody CreateWorkItemRequest request
    ) {
        WorkItemService.MutationResult result = service.create(
                idempotencyKey,
                new WorkItemService.CreateCommand(request.title(), request.description())
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .header("Idempotency-Replayed", Boolean.toString(result.replayed()))
                .body(result.item());
    }

    @PostMapping("/{workItemId}/transitions")
    public ResponseEntity<WorkItem> transition(
            @PathVariable UUID workItemId,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(name = "If-Match", required = false) String ifMatch,
            @RequestBody TransitionWorkItemRequest request
    ) {
        long expectedVersion = parseVersion(ifMatch);
        WorkItemService.MutationResult result = service.transition(
                idempotencyKey,
                workItemId,
                expectedVersion,
                request.action()
        );
        return ResponseEntity.ok()
                .header("Idempotency-Replayed", Boolean.toString(result.replayed()))
                .body(result.item());
    }

    private static long parseVersion(String value) {
        if (value == null || !value.matches("^[0-9]+$")) {
            throw new DomainException.InvalidRequest("If-Match must contain the current integer version");
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            throw new DomainException.InvalidRequest("If-Match version is outside the supported integer range");
        }
    }

    public record CreateWorkItemRequest(String title, String description) {
    }

    public record TransitionWorkItemRequest(TransitionAction action) {
    }

    public record WorkItemListResponse(List<WorkItem> items) {
    }
}
