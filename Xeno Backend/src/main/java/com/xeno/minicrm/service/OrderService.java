package com.xeno.minicrm.service;

import com.xeno.minicrm.entity.Communication;
import com.xeno.minicrm.entity.Order;
import com.xeno.minicrm.entity.enums.CommunicationStatus;
import com.xeno.minicrm.repository.CommunicationRepository;
import com.xeno.minicrm.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Handles order creation with deterministic last-touch attribution.
 *
 * <p><strong>Attribution model:</strong> When a new order is placed, the service
 * looks back exactly 7 days for the most recent communication to that customer
 * that reached a qualifying status (DELIVERED, OPENED, READ, or CLICKED).
 * If found, the order is attributed to that communication by setting the
 * {@code attributed_order_id} foreign key.</p>
 *
 * <p><strong>Why "most recent wins":</strong> If a customer received multiple
 * campaign messages within the lookback window, we attribute the conversion to
 * the last one they interacted with — a standard last-touch attribution model
 * used across the ad-tech industry (Google Ads, Meta, etc.).</p>
 *
 * <p><strong>Why 7 days:</strong> A 7-day lookback balances recency relevance
 * against common purchase decision cycles. Too short (1 day) misses delayed
 * conversions. Too long (30+ days) dilutes attribution signal and inflates
 * campaign ROI metrics.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final CommunicationRepository communicationRepository;

    /**
     * Attribution lookback window — 7 days.
     */
    private static final int ATTRIBUTION_WINDOW_DAYS = 7;

    /**
     * Qualifying communication statuses for attribution.
     * PENDING, SENT, and FAILED are excluded because the customer never received those.
     */
    private static final List<CommunicationStatus> QUALIFYING_STATUSES = List.of(
            CommunicationStatus.DELIVERED,
            CommunicationStatus.OPENED,
            CommunicationStatus.READ,
            CommunicationStatus.CLICKED
    );

    /**
     * Creates a new order and attempts last-touch attribution.
     *
     * <p>Steps:</p>
     * <ol>
     *   <li>Calculate the lookback boundary (now − 7 days)</li>
     *   <li>Query for the most recent qualifying communication to this customer</li>
     *   <li>Save the order to get a generated UUID</li>
     *   <li>If a qualifying communication exists, link it to the order via {@code attributed_order_id}</li>
     * </ol>
     *
     * @param order the order entity (customer and orderValue must be set)
     * @return the saved order with generated ID
     */
    @Transactional
    public Order createOrder(Order order) {
        // --- Step 1: Calculate the 7-day lookback boundary ---
        LocalDateTime lookbackBoundary = LocalDateTime.now().minusDays(ATTRIBUTION_WINDOW_DAYS);
        log.info("Attribution lookback window: {} → now (customer={})",
                lookbackBoundary, order.getCustomer().getId());

        // --- Step 2: Find the most recent qualifying communication ---
        Optional<Communication> attributableComm = communicationRepository
                .findTopByCustomerIdAndStatusInAndSentAtAfterOrderBySentAtDesc(
                        order.getCustomer().getId(),
                        QUALIFYING_STATUSES,
                        lookbackBoundary
                );

        // --- Step 3: Save the order (generates UUID) ---
        Order savedOrder = orderRepository.save(order);
        log.info("Order saved: id={}, value={}, customer={}",
                savedOrder.getId(), savedOrder.getOrderValue(), savedOrder.getCustomer().getId());

        // --- Step 4: Attribute if qualifying communication found ---
        if (attributableComm.isPresent()) {
            Communication comm = attributableComm.get();
            comm.setAttributedOrder(savedOrder);
            communicationRepository.save(comm);
            log.info("Order {} attributed to communication {} (campaign={}, channel={}, status={}, sent_at={})",
                    savedOrder.getId(),
                    comm.getId(),
                    comm.getCampaign().getId(),
                    comm.getChannelType(),
                    comm.getStatus(),
                    comm.getSentAt());
        } else {
            log.info("No qualifying communication found within lookback window — order {} is organic",
                    savedOrder.getId());
        }

        return savedOrder;
    }
}
