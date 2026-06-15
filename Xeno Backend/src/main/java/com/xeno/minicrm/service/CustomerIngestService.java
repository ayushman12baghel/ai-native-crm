package com.xeno.minicrm.service;

import com.xeno.minicrm.dto.BulkIngestRequest;
import com.xeno.minicrm.dto.CustomerIngestRequest;
import com.xeno.minicrm.entity.Customer;
import com.xeno.minicrm.entity.Order;
import com.xeno.minicrm.repository.CustomerRepository;
import com.xeno.minicrm.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerIngestService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public Customer ingestSingleCustomer(CustomerIngestRequest request) {
        log.info("Ingesting single customer: {}", request.getName());
        
        Customer customer = Customer.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .build();
                
        customer = customerRepository.save(customer);
        
        if (request.getInitialOrderValue() != null && request.getInitialOrderValue().compareTo(BigDecimal.ZERO) > 0) {
            Order order = Order.builder()
                    .customer(customer)
                    .orderValue(request.getInitialOrderValue())
                    .build();
            orderRepository.save(order);
            log.info("Created initial order of {} for customer {}", request.getInitialOrderValue(), customer.getId());
        }
        
        return customer;
    }

    @Transactional
    public List<Customer> ingestBulkCustomers(BulkIngestRequest request) {
        log.info("Starting bulk ingestion of {} customers", request.getCustomers().size());
        List<Customer> savedCustomers = new ArrayList<>();
        
        for (CustomerIngestRequest custReq : request.getCustomers()) {
            Customer c = ingestSingleCustomer(custReq);
            savedCustomers.add(c);
        }
        
        log.info("Successfully ingested {} customers in bulk", savedCustomers.size());
        return savedCustomers;
    }
}
