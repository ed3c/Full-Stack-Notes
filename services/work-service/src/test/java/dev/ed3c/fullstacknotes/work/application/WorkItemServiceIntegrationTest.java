package dev.ed3c.fullstacknotes.work.application;

import dev.ed3c.fullstacknotes.work.domain.DomainException;
import dev.ed3c.fullstacknotes.work.domain.TransitionAction;
import dev.ed3c.fullstacknotes.work.domain.WorkItem;
import dev.ed3c.fullstacknotes.work.domain.WorkItemStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class WorkItemServiceIntegrationTest {
    @Autowired
    WorkItemService service;

    @Autowired
    JdbcClient jdbc;

    private ExecutorService executor;

    @BeforeEach
    void setUp() {
        executor = Executors.newFixedThreadPool(2);
        jdbc.sql("DELETE FROM idempotency_record").update();
        jdbc.sql("DELETE FROM work_item").update();
    }

    @AfterEach
    void tearDown() {
        if (executor != null) {
            executor.shutdownNow();
        }
    }

    @Test
    void replaysSameCreateAndRejectsKeyReuseWithDifferentRequest() {
        WorkItemService.MutationResult first = service.create(
                "create-key-0001",
                new WorkItemService.CreateCommand("Investigate alert", "customer-visible latency")
        );
        WorkItemService.MutationResult replay = service.create(
                "create-key-0001",
                new WorkItemService.CreateCommand("Investigate alert", "customer-visible latency")
        );

        assertThat(first.replayed()).isFalse();
        assertThat(replay.replayed()).isTrue();
        assertThat(replay.item()).isEqualTo(first.item());
        assertThat(countRows("work_item")).isEqualTo(1);

        assertThatThrownBy(() -> service.create(
                "create-key-0001",
                new WorkItemService.CreateCommand("Different request", "customer-visible latency")
        )).isInstanceOf(DomainException.IdempotencyConflict.class);
    }

    @Test
    void concurrentDuplicateCreateProducesOneResource() throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        Future<WorkItemService.MutationResult> a = executor.submit(() -> {
            ready.countDown();
            start.await();
            return service.create(
                    "concurrent-create-0001",
                    new WorkItemService.CreateCommand("Same command", "same payload")
            );
        });
        Future<WorkItemService.MutationResult> b = executor.submit(() -> {
            ready.countDown();
            start.await();
            return service.create(
                    "concurrent-create-0001",
                    new WorkItemService.CreateCommand("Same command", "same payload")
            );
        });

        ready.await();
        start.countDown();

        List<WorkItemService.MutationResult> results = List.of(a.get(), b.get());
        assertThat(results).extracting(result -> result.item().id()).containsOnly(results.getFirst().item().id());
        assertThat(results).extracting(WorkItemService.MutationResult::replayed)
                .containsExactlyInAnyOrder(false, true);
        assertThat(countRows("work_item")).isEqualTo(1);
        assertThat(countRows("idempotency_record")).isEqualTo(1);
    }

    @Test
    void concurrentTransitionsPreventLostUpdate() throws Exception {
        WorkItem created = service.create(
                "create-key-0002",
                new WorkItemService.CreateCommand("Race target", null)
        ).item();
        WorkItem inProgress = service.transition(
                "claim-key-0001",
                created.id(),
                created.version(),
                TransitionAction.CLAIM
        ).item();
        assertThat(inProgress.status()).isEqualTo(WorkItemStatus.IN_PROGRESS);
        assertThat(inProgress.version()).isEqualTo(2);

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Future<TransitionOutcome> complete = executor.submit(() -> transitionOutcome(
                ready,
                start,
                "complete-key-0001",
                inProgress,
                TransitionAction.COMPLETE
        ));
        Future<TransitionOutcome> release = executor.submit(() -> transitionOutcome(
                ready,
                start,
                "release-key-0001",
                inProgress,
                TransitionAction.RELEASE
        ));

        ready.await();
        start.countDown();

        List<TransitionOutcome> outcomes = List.of(complete.get(), release.get());
        assertThat(outcomes).filteredOn(TransitionOutcome::success).hasSize(1);
        assertThat(outcomes).filteredOn(outcome -> outcome.error() instanceof DomainException.VersionConflict)
                .hasSize(1);

        WorkItem current = service.get(created.id());
        assertThat(current.version()).isEqualTo(3);
        assertThat(current.status()).isIn(WorkItemStatus.DONE, WorkItemStatus.OPEN);
    }

    @Test
    void invalidTransitionDoesNotChangeState() {
        WorkItem created = service.create(
                "create-key-0003",
                new WorkItemService.CreateCommand("Invalid transition", null)
        ).item();

        assertThatThrownBy(() -> service.transition(
                "invalid-transition-0001",
                created.id(),
                created.version(),
                TransitionAction.COMPLETE
        )).isInstanceOf(DomainException.InvalidTransition.class);

        WorkItem after = service.get(created.id());
        assertThat(after.status()).isEqualTo(WorkItemStatus.OPEN);
        assertThat(after.version()).isEqualTo(1);
        assertThat(countRows("idempotency_record")).isEqualTo(1);
    }

    private TransitionOutcome transitionOutcome(
            CountDownLatch ready,
            CountDownLatch start,
            String idempotencyKey,
            WorkItem item,
            TransitionAction action
    ) throws InterruptedException {
        ready.countDown();
        start.await();
        try {
            WorkItem result = service.transition(idempotencyKey, item.id(), item.version(), action).item();
            return new TransitionOutcome(true, result, null);
        } catch (RuntimeException exception) {
            return new TransitionOutcome(false, null, exception);
        }
    }

    private long countRows(String table) {
        return jdbc.sql("SELECT count(*) FROM " + table)
                .query(Long.class)
                .single();
    }

    private record TransitionOutcome(boolean success, WorkItem item, RuntimeException error) {
    }
}
