package dev.ed3c.fullstacknotes.work.outbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

@Component
public class OutboxRelay {
    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    private final OutboxRepository repository;
    private final EventPublisher publisher;
    private final boolean enabled;
    private final int batchSize;
    private final Duration lease;
    private final Duration baseRetryDelay;
    private final String workerId;

    @Autowired
    public OutboxRelay(
            OutboxRepository repository,
            EventPublisher publisher,
            @Value("${outbox.relay.enabled:true}") boolean enabled,
            @Value("${outbox.relay.batch-size:20}") int batchSize,
            @Value("${outbox.relay.lease-seconds:30}") long leaseSeconds,
            @Value("${outbox.relay.retry-base-ms:250}") long retryBaseMs
    ) {
        this(repository, publisher, enabled, batchSize, Duration.ofSeconds(leaseSeconds), Duration.ofMillis(retryBaseMs), UUID.randomUUID().toString());
    }

    public OutboxRelay(
            OutboxRepository repository,
            EventPublisher publisher,
            boolean enabled,
            int batchSize,
            Duration lease,
            Duration baseRetryDelay,
            String workerId
    ) {
        this.repository = repository;
        this.publisher = publisher;
        this.enabled = enabled;
        this.batchSize = batchSize;
        this.lease = lease;
        this.baseRetryDelay = baseRetryDelay;
        this.workerId = workerId;
    }

    @Scheduled(fixedDelayString = "${outbox.relay.fixed-delay:PT0.5S}")
    public void scheduledPublish() {
        if (enabled) {
            publishOnce();
        }
    }

    public int publishOnce() {
        if (!enabled) {
            return 0;
        }
        int published = 0;
        for (OutboxEvent event : repository.claimBatch(workerId, batchSize, lease)) {
            try {
                publisher.publish(event);
                if (!repository.markPublished(event.eventId(), workerId)) {
                    throw new IllegalStateException("outbox lease was lost before publish acknowledgement for " + event.eventId());
                }
                published += 1;
            } catch (Exception exception) {
                Duration delay = retryDelay(event.attemptCount());
                repository.releaseFailure(event.eventId(), workerId, delay, exception.toString());
                OutboxRepository.PendingSnapshot snapshot = repository.pendingSnapshot();
                log.warn(
                        "outbox publish failed event_id={} attempt={} retry_ms={} pending_count={} oldest_pending_seconds={}",
                        event.eventId(), event.attemptCount(), delay.toMillis(), snapshot.pendingCount(), snapshot.oldestAgeSeconds(), exception
                );
            }
        }
        return published;
    }

    private Duration retryDelay(int attemptCount) {
        int exponent = Math.max(0, Math.min(attemptCount - 1, 6));
        return baseRetryDelay.multipliedBy(1L << exponent);
    }
}
