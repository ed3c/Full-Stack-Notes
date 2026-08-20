package dev.ed3c.fullstacknotes.work.domain;

import org.springframework.stereotype.Component;

@Component
public final class WorkItemStateMachine {
    public WorkItemStatus apply(WorkItemStatus current, TransitionAction action) {
        return switch (current) {
            case OPEN -> switch (action) {
                case CLAIM -> WorkItemStatus.IN_PROGRESS;
                case CANCEL -> WorkItemStatus.CANCELLED;
                default -> throw new DomainException.InvalidTransition(current, action);
            };
            case IN_PROGRESS -> switch (action) {
                case COMPLETE -> WorkItemStatus.DONE;
                case RELEASE -> WorkItemStatus.OPEN;
                case CANCEL -> WorkItemStatus.CANCELLED;
                default -> throw new DomainException.InvalidTransition(current, action);
            };
            case DONE, CANCELLED -> throw new DomainException.InvalidTransition(current, action);
        };
    }
}
