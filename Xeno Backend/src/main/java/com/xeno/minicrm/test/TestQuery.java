package com.xeno.minicrm.test;
import com.xeno.minicrm.repository.CustomerRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
public class TestQuery implements CommandLineRunner {
    private final CustomerRepository customerRepository;
    public TestQuery(CustomerRepository customerRepository) { this.customerRepository = customerRepository; }
    @Override
    public void run(String... args) {
        LocalDateTime date = LocalDateTime.parse("2025-12-13T00:00:00");
        int count = customerRepository.findCustomersByNoPurchasesSince(date).size();
        System.out.println("[SYSTEM_TEST] CUSTOMERS MATCHED: " + count);
    }
}
