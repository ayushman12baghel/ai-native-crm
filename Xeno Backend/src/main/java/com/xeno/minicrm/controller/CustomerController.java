package com.xeno.minicrm.controller;

import com.xeno.minicrm.dto.BulkIngestRequest;
import com.xeno.minicrm.dto.CustomerIngestRequest;
import com.xeno.minicrm.entity.Customer;
import com.xeno.minicrm.entity.Order;
import com.xeno.minicrm.repository.CustomerRepository;
import com.xeno.minicrm.service.CustomerIngestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * REST API controller for customer data.
 *
 * <p>Endpoints:</p>
 * <ul>
 *   <li>{@code GET /api/customers} — List all customers with order aggregates</li>
 *   <li>{@code POST /api/customers} — Ingest a single customer manually</li>
 *   <li>{@code POST /api/customers/bulk} — Ingest multiple customers via CSV upload</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Slf4j
public class CustomerController {

    private final CustomerRepository customerRepository;
    private final CustomerIngestService customerIngestService;

    /**
     * Lists all customers with aggregated order statistics.
     *
     * <p>Returns a JSON array where each customer object includes:
     * id, name, email, phone, createdAt, totalOrders, totalSpent, lastOrderAt.</p>
     *
     * @return list of customer summary objects
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listCustomers() {
        List<Customer> customers = customerRepository.findAll();

        List<Map<String, Object>> result = customers.stream().map(c -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", c.getId());
            dto.put("name", c.getName());
            dto.put("email", c.getEmail());
            dto.put("phone", c.getPhone());
            dto.put("createdAt", c.getCreatedAt());

            // Order aggregates
            List<Order> orders = c.getOrders();
            dto.put("totalOrders", orders.size());

            BigDecimal totalSpent = orders.stream()
                    .map(Order::getOrderValue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            dto.put("totalSpent", totalSpent);

            orders.stream()
                    .map(Order::getCreatedAt)
                    .max(Comparator.naturalOrder())
                    .ifPresentOrElse(
                            last -> dto.put("lastOrderAt", last),
                            ()   -> dto.put("lastOrderAt", null)
                    );

            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Ingests a single customer (e.g., from a manual entry form).
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> ingestSingleCustomer(@RequestBody CustomerIngestRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Customer name is required"));
        }

        try {
            Customer savedCustomer = customerIngestService.ingestSingleCustomer(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Customer successfully ingested",
                    "id", savedCustomer.getId()
            ));
        } catch (Exception e) {
            log.error("Failed to ingest single customer", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Ingests multiple customers (e.g., from a CSV upload).
     */
    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> ingestBulkCustomers(@RequestBody BulkIngestRequest request) {
        if (request.getCustomers() == null || request.getCustomers().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No customers provided in bulk payload"));
        }

        try {
            List<Customer> savedCustomers = customerIngestService.ingestBulkCustomers(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Bulk ingestion successful",
                    "count", savedCustomers.size()
            ));
        } catch (Exception e) {
            log.error("Failed to process bulk ingestion", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
