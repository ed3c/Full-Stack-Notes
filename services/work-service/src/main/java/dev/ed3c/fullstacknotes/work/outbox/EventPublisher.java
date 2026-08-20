package dev.ed3c.fullstacknotes.work.outbox;

public interface EventPublisher {
    void publish(OutboxEvent event) throws Exception;
}
