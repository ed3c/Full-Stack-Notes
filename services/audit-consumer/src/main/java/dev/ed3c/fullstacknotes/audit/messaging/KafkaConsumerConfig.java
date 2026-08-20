package dev.ed3c.fullstacknotes.audit.messaging;

import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.config.TopicBuilder;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConsumerConfig {
    @Bean
    DefaultErrorHandler auditErrorHandler(KafkaTemplate<String, String> template) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                template,
                (record, exception) -> new TopicPartition(record.topic() + "-dlt", record.partition())
        );
        recoverer.setFailIfSendResultIsError(true);
        return new DefaultErrorHandler(recoverer, new FixedBackOff(100L, 2L));
    }

    @Bean
    ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory,
            DefaultErrorHandler auditErrorHandler
    ) {
        ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.RECORD);
        factory.setCommonErrorHandler(auditErrorHandler);
        return factory;
    }

    @Bean
    NewTopic auditTopic(@Value("${audit.topic:work-item-events.v1}") String topic) {
        return TopicBuilder.name(topic).partitions(1).replicas(1).build();
    }

    @Bean
    NewTopic auditDeadLetterTopic(@Value("${audit.topic:work-item-events.v1}") String topic) {
        return TopicBuilder.name(topic + "-dlt").partitions(1).replicas(1).build();
    }
}
