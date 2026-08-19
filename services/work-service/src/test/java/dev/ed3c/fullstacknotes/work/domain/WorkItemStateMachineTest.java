package dev.ed3c.fullstacknotes.work.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkItemStateMachineTest {
    private final WorkItemStateMachine stateMachine = new WorkItemStateMachine();

    @Test
    void allowsDocumentedTransitions() {
        assertThat(stateMachine.apply(WorkItemStatus.OPEN, TransitionAction.CLAIM))
                .isEqualTo(WorkItemStatus.IN_PROGRESS);
        assertThat(stateMachine.apply(WorkItemStatus.OPEN, TransitionAction.CANCEL))
                .isEqualTo(WorkItemStatus.CANCELLED);
        assertThat(stateMachine.apply(WorkItemStatus.IN_PROGRESS, TransitionAction.COMPLETE))
                .isEqualTo(WorkItemStatus.DONE);
        assertThat(stateMachine.apply(WorkItemStatus.IN_PROGRESS, TransitionAction.RELEASE))
                .isEqualTo(WorkItemStatus.OPEN);
        assertThat(stateMachine.apply(WorkItemStatus.IN_PROGRESS, TransitionAction.CANCEL))
                .isEqualTo(WorkItemStatus.CANCELLED);
    }

    @Test
    void rejectsInvalidAndTerminalTransitions() {
        assertThatThrownBy(() -> stateMachine.apply(WorkItemStatus.OPEN, TransitionAction.COMPLETE))
                .isInstanceOf(DomainException.InvalidTransition.class);
        assertThatThrownBy(() -> stateMachine.apply(WorkItemStatus.DONE, TransitionAction.RELEASE))
                .isInstanceOf(DomainException.InvalidTransition.class);
        assertThatThrownBy(() -> stateMachine.apply(WorkItemStatus.CANCELLED, TransitionAction.CLAIM))
                .isInstanceOf(DomainException.InvalidTransition.class);
    }
}
