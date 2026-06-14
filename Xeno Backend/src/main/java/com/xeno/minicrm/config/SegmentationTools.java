package com.xeno.minicrm.config;

import com.xeno.minicrm.entity.Customer;
import com.xeno.minicrm.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Defines safe, predefined Java tools that the Gemini LLM can invoke
 * via Spring AI's function-calling mechanism.
 *
 * <p><strong>Why this architecture is SQL-injection proof:</strong><br>
 * The LLM never constructs or sees SQL. It can only call these predefined
 * Java methods with typed parameters. The methods internally use parameterized
 * JPQL queries via Spring Data JPA — the LLM's input is always a bound
 * parameter, never raw SQL.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SegmentationTools {

    private final CustomerRepository customerRepository;

    // --- Request/Response records for function type signatures ---

    public record NoPurchaseRequest(String sinceDate) {}
    public record MinOrderValueRequest(String minOrderValue) {}
    public record CustomerIdList(List<UUID> customerIds, int count) {}

    /**
     * Tool: retrieves dormant customers (no purchases since a date).
     * Gemini will call this when the marketer's goal involves re-engagement,
     * lapsed customers, or inactivity-based segmentation.
     */
    @Tool(name = "findCustomersByNoPurchasesSince",
          description = "Retrieves a list of customer IDs who have not made any purchase since a specific date. " +
                        "Use this when the marketer wants to target inactive, dormant, or lapsed customers. " +
                        "Input: sinceDate in ISO format (e.g., '2025-01-01T00:00:00'). " +
                        "Returns: list of customer UUIDs and the total count.")
    public CustomerIdList findCustomersByNoPurchasesSince(NoPurchaseRequest request) {
        log.info("Tool called: findCustomersByNoPurchasesSince(sinceDate={})", request.sinceDate());
        LocalDateTime date = LocalDateTime.parse(request.sinceDate(), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        List<Customer> customers = customerRepository.findCustomersByNoPurchasesSince(date);
        List<UUID> ids = customers.stream().map(Customer::getId).toList();
        log.info("Found {} dormant customers since {}", ids.size(), date);
        return new CustomerIdList(ids, ids.size());
    }

    /**
     * Tool: retrieves high-value customers by minimum order value.
     * Gemini will call this when the marketer's goal involves high-spenders,
     * premium tiers, or value-based segmentation.
     */
    @Tool(name = "findCustomersByMinimumOrderValue",
          description = "Retrieves a list of customer IDs whose TOTAL lifetime spend (sum of all their orders) is " +
                        "greater than or equal to a specified minimum threshold. " +
                        "Use this when the marketer wants to target VIPs, high-value, or premium customers based on total spend. " +
                        "Input: minOrderValue as a decimal number string (e.g., '15000.00'). " +
                        "Returns: list of customer UUIDs and the total count.")
    public CustomerIdList findCustomersByMinimumOrderValue(MinOrderValueRequest request) {
        log.info("Tool called: findCustomersByMinimumOrderValue(minOrderValue={})", request.minOrderValue());
        BigDecimal threshold = new BigDecimal(request.minOrderValue());
        List<Customer> customers = customerRepository.findCustomersByMinimumOrderValue(threshold);
        List<UUID> ids = customers.stream().map(Customer::getId).toList();
        log.info("Found {} high-value customers (threshold >= {})", ids.size(), threshold);
        return new CustomerIdList(ids, ids.size());
    }
}
