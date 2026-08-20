package dev.ed3c.fullstacknotes.work.outbox;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

@Component
public final class KafkaEventPublisher implements EventPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final long sendTimeoutMs;

    public KafkaEventPublisher(
            KafkaTemplate<String, String> kafkaTemplate,
            @Value("${outbox.relay.send-timeout-ms:3000}") long sendTimeoutMs
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.sendTimeoutMs = sendTimeoutMs;
    }

    @Override
    public void publish(OutboxEvent event) throws Exception {
        ProducerRecord<String, String> record = new ProducerRecord<>(
                event.topic(),
                event.partitionKey(),
                event.eventJson()
        );
        addHeader(record, "event-id", event.eventId().toString());
        addHeader(record, "trace-id", event.traceId());
        addHeader(record, "schema-version", Integer.toString(event.schemaVersion()));
        kafkaTemplate.send(record).get(sendTimeoutMs, TimeUnit.MILLISECONDS);
    }

    private static void addHeader(ProducerRecord<String, String> record, String name, String value) {
        if (value != null) {
            record.headers().add(name, value.getBytes(StandardCharsets.UTF_8));
        }
    }
}
