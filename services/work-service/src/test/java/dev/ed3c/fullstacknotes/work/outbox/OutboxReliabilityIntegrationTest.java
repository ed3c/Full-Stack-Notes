package dev.ed3c.fullstacknotes.work.outbox;

import dev.ed3c.fullstacknotes.work.application.WorkItemService;
import dev.ed3c.fullstacknotes.work.domain.TransitionAction;
import dev.ed3c.fullstacknotes.work.domain.WorkItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "outbox.relay.enabled=false")
class OutboxReliabilityIntegrationTest {
    @Autowired WorkItemService service;
    @Autowired OutboxRepository outbox;
    @Autowired JdbcClient jdbc;

    @BeforeEach
    void clean() {
        jdbc.sql("DELETE FROM outbox_event").update();
        jdbc.sql("DELETE FROM idempotency_record").update();
        jdbc.sql("DELETE FROM work_item").update();
    }

    @Test
    void domainMutationAndOutboxCommitTogetherAndReplayDoesNotDuplicateEvent() {
        WorkItemService.MutationResult first = service.create(
                "outbox-create-key-0001",
                "request-outbox-0001",
                new WorkItemService.CreateCommand("Audit me", "transactional outbox")
        );
        WorkItemService.MutationResult replay = service.create(
                "outbox-create-key-0001",
                "request-outbox-0001",
                new WorkItemService.CreateCommand("Audit me", "transactional outbox")
        );

        assertThat(first.replayed()).isFalse();
        assertThat(replay.replayed()).isTrue();
        assertThat(count("work_item")).isEqualTo(1);
        assertThat(count("outbox_event")).isEqualTo(1);

        String eventJson = jdbc.sql("SELECT event_json::text FROM outbox_event").query(String.class).single();
        assertThat(eventJson).contains("WorkItemCreated", "request-outbox-0001", first.item().id().toString());
        assertThat(eventJson).doesNotContain("outbox-create-key-0001");
    }

    @Test
    void transitionProducesNextAggregateVersionEvent() {
        WorkItem created = service.create(
                "outbox-create-key-0002",
                "request-outbox-0002",
                new WorkItemService.CreateCommand("Transition me", null)
        ).item();
        WorkItem transitioned = service.transition(
                "outbox-claim-key-0001",
                "request-outbox-0003",
                created.id(),
                created.version(),
                TransitionAction.CLAIM
        ).item();

        assertThat(transitioned.version()).isEqualTo(2);
        assertThat(count("outbox_event")).isEqualTo(2);
        String transitionJson = jdbc.sql("""
                SELECT event_json::text FROM outbox_event
                WHERE aggregate_id = :id AND aggregate_version = 2
                """).param("id", created.id()).query(String.class).single();
        assertThat(transitionJson).contains("WorkItemTransitioned", "OPEN", "IN_PROGRESS", "CLAIM", "request-outbox-0003");
    }

    @Test
    void failedPublishLeavesDurablePendingRowAndRecoveryReusesSameEventId() {
        WorkItem created = service.create(
                "outbox-create-key-0003",
                "request-outbox-0004",
                new WorkItemService.CreateCommand("Broker outage", null)
        ).item();

        List<OutboxEvent> failedAttempts = new ArrayList<>();
        EventPublisher failing = event -> {
            failedAttempts.add(event);
            throw new IllegalStateException("broker unavailable");
        };
        OutboxRelay failingRelay = new OutboxRelay(
                outbox, failing, true, 10, Duration.ofSeconds(30), Duration.ZERO, "worker-fail"
        );
        assertThat(failingRelay.publishOnce()).isZero();
        assertThat(outbox.pendingSnapshot().pendingCount()).isEqualTo(1);
        assertThat(jdbc.sql("SELECT last_error FROM outbox_event WHERE aggregate_id = :id")
                .param("id", created.id()).query(String.class).single()).contains("broker unavailable");

        List<OutboxEvent> recovered = new ArrayList<>();
        OutboxRelay recoveryRelay = new OutboxRelay(
                outbox, recovered::add, true, 10, Duration.ZERO, Duration.ZERO, "worker-recovery"
        );
        assertThat(recoveryRelay.publishOnce()).isEqualTo(1);
        assertThat(recovered).hasSize(1);
        assertThat(recovered.getFirst().eventId()).isEqualTo(failedAttempts.getFirst().eventId());
        assertThat(outbox.pendingSnapshot().pendingCount()).isZero();
        assertThat(jdbc.sql("SELECT published_at IS NOT NULL FROM outbox_event WHERE aggregate_id = :id")
                .param("id", created.id()).query(Boolean.class).single()).isTrue();
    }

    private long count(String table) {
        return jdbc.sql("SELECT count(*) FROM " + table).query(Long.class).single();
    }
}
