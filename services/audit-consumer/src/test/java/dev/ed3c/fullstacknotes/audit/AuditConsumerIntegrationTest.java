package dev.ed3c.fullstacknotes.audit;

import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "audit.topic=work-item-events-test",
        "audit.group-id=audit-consumer-test"
})
@EmbeddedKafka(partitions = 1, topics = {"work-item-events-test", "work-item-events-test-dlt"})
class AuditConsumerIntegrationTest {
    @Autowired KafkaTemplate<String, String> kafkaTemplate;
    @Autowired EmbeddedKafkaBroker broker;
    @Autowired JdbcClient jdbc;

    @BeforeEach
    void clean() {
        jdbc.sql("DELETE FROM audit.audit_event").update();
    }

    @Test
    void duplicateDeliveryProducesOneProjectionAndPreservesCorrelation() throws Exception {
        String eventId = UUID.randomUUID().toString();
        String aggregateId = UUID.randomUUID().toString();
        String json = eventJson(eventId, aggregateId, "trace-duplicate-001", "request-duplicate-001");

        kafkaTemplate.send("work-item-events-test", aggregateId, json).get();
        kafkaTemplate.send("work-item-events-test", aggregateId, json).get();

        awaitCount(1);
        assertThat(jdbc.sql("SELECT count(*) FROM audit.audit_event").query(Long.class).single()).isEqualTo(1);
        Map<String, Object> row = jdbc.sql("SELECT trace_id, request_id FROM audit.audit_event WHERE event_id = :id")
                .param("id", UUID.fromString(eventId)).query().singleRow();
        assertThat(row.get("trace_id")).isEqualTo("trace-duplicate-001");
        assertThat(row.get("request_id")).isEqualTo("request-duplicate-001");
    }

    @Test
    void poisonEventIsRetriedThenQuarantinedToDlt() throws Exception {
        Map<String, Object> props = KafkaTestUtils.consumerProps(broker, "dlt-observer-" + UUID.randomUUID(), false);
        Consumer<String, String> consumer = new DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                new StringDeserializer()
        ).createConsumer();
        broker.consumeFromAnEmbeddedTopic(consumer, "work-item-events-test-dlt");
        try {
            kafkaTemplate.send("work-item-events-test", "bad-key", "{\"eventId\":\"not-a-uuid\"}").get();
            ConsumerRecord<String, String> dlt = KafkaTestUtils.getSingleRecord(
                    consumer,
                    "work-item-events-test-dlt",
                    Duration.ofSeconds(10)
            );
            assertThat(dlt.value()).contains("not-a-uuid");
            assertThat(jdbc.sql("SELECT count(*) FROM audit.audit_event").query(Long.class).single()).isZero();
        } finally {
            consumer.close();
        }
    }

    private void awaitCount(long expected) throws InterruptedException {
        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
        while (System.nanoTime() < deadline) {
            long count = jdbc.sql("SELECT count(*) FROM audit.audit_event").query(Long.class).single();
            if (count == expected) return;
            Thread.sleep(50);
        }
        throw new AssertionError("audit event count did not reach " + expected);
    }

    private static String eventJson(String eventId, String aggregateId, String traceId, String requestId) {
        return """
                {"eventId":"%s","eventType":"WorkItemCreated","schemaVersion":1,
                 "occurredAt":"2026-08-20T00:00:00Z","aggregateId":"%s","aggregateVersion":1,
                 "traceId":"%s","requestId":"%s","idempotencyKeyHash":null,
                 "payload":{"kind":"created","title":"Audit integration","status":"OPEN"}}
                """.formatted(eventId, aggregateId, traceId, requestId);
    }
}
