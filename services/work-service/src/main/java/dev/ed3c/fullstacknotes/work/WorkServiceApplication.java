package dev.ed3c.fullstacknotes.work;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WorkServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(WorkServiceApplication.class, args);
    }
}
