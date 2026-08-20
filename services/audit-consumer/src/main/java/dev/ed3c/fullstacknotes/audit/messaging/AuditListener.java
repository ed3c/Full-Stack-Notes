package dev.ed3c.fullstacknotes.audit.messaging;

import dev.ed3c.fullstacknotes.audit.application.AuditProcessor;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public final class AuditListener {
    private final AuditProcessor processor;

    public AuditListener(AuditProcessor processor) {
        this.processor = processor;
    }

    @KafkaListener(topics = "${audit.topic:work-item-events.v1}", groupId = "${audit.group-id:audit-consumer-v1}")
    public void consume(ConsumerRecord<String, String> record) {
        processor.process(record);
    }
}
