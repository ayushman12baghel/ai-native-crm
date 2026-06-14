package com.xeno.minicrm.controller;

import com.xeno.minicrm.entity.Customer;
import com.xeno.minicrm.entity.Order;
import com.xeno.minicrm.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * </ul>
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Slf4j
public class CustomerController {

    private final CustomerRepository customerRepository;

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
}
