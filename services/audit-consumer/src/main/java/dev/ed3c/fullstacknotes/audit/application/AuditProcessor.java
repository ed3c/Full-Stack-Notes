package dev.ed3c.fullstacknotes.audit.application;

import dev.ed3c.fullstacknotes.audit.event.AuditEvent;
import dev.ed3c.fullstacknotes.audit.event.AuditEventParser;
import dev.ed3c.fullstacknotes.audit.persistence.AuditEventRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.header.Header;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;

@Service
public class AuditProcessor {
    private final AuditEventParser parser;
    private final AuditEventRepository repository;

    public AuditProcessor(AuditEventParser parser, AuditEventRepository repository) {
        this.parser = parser;
        this.repository = repository;
    }

    @Transactional
    public AuditEventRepository.ApplyResult process(ConsumerRecord<String, String> record) {
        AuditEvent event = parser.parse(record.value());
        if (record.key() != null && !record.key().equals(event.aggregateId().toString())) {
            throw new IllegalArgumentException("Kafka key does not match aggregateId");
        }
        assertHeader(record, "event-id", event.eventId().toString());
        assertHeader(record, "trace-id", event.traceId());
        return repository.apply(event, record.topic(), record.partition(), record.offset());
    }

    private static void assertHeader(ConsumerRecord<String, String> record, String name, String expected) {
        Header header = record.headers().lastHeader(name);
        if (header == null) return;
        String actual = new String(header.value(), StandardCharsets.UTF_8);
        if (!actual.equals(expected)) {
            throw new IllegalArgumentException(name + " header does not match event envelope");
        }
    }
}
