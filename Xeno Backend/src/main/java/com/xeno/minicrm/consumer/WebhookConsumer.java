package com.xeno.minicrm.consumer;

import com.xeno.minicrm.config.RabbitMQConfig;
import com.xeno.minicrm.dto.DeliveryReceiptDTO;
import com.xeno.minicrm.entity.Communication;
import com.xeno.minicrm.entity.enums.CommunicationStatus;
import com.xeno.minicrm.repository.CommunicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Asynchronous consumer for webhook delivery receipt messages.
 *
 * <p>
 * Listens on the {@code webhook.receipts} queue, parses the incoming
 * {@link DeliveryReceiptDTO}, looks up the corresponding {@link Communication}
 * entity, and updates its status in PostgreSQL.
 * </p>
 *
 * <p>
 * If the communication_id is not found or the status is invalid, the message
 * is rejected without requeue — RabbitMQ routes it to the Dead-Letter Queue
 * for manual inspection.
 * </p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookConsumer {

    private final CommunicationRepository communicationRepository;

    @RabbitListener(queues = RabbitMQConfig.MAIN_QUEUE)
    public void handleDeliveryReceipt(DeliveryReceiptDTO receipt) {
        log.info("Consuming delivery receipt: communication_id={}, status={}",
                receipt.getCommunicationId(), receipt.getStatus());

        // --- Parse communication ID ---
        UUID communicationId;
        try {
            communicationId = UUID.fromString(receipt.getCommunicationId());
        } catch (IllegalArgumentException e) {
            log.error("Invalid communication_id format: {}", receipt.getCommunicationId());
            throw new IllegalArgumentException("Invalid communication_id: " + receipt.getCommunicationId());
        }

        // --- Parse status ---
        CommunicationStatus newStatus;
        try {
            newStatus = CommunicationStatus.valueOf(receipt.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            log.error("Invalid status value: {}", receipt.getStatus());
            throw new IllegalArgumentException("Invalid status: " + receipt.getStatus());
        }

        // --- Lookup and update ---
        Optional<Communication> optComm = communicationRepository.findById(communicationId);

        if (optComm.isEmpty()) {
            log.warn("Dropping invalid webhook. Communication not found for id={}", communicationId);
            return; // Graceful exit: tells RabbitMQ to delete the message instead of retrying
        }

        Communication communication = optComm.get();
        CommunicationStatus previousStatus = communication.getStatus();
        communication.setStatus(newStatus);
        communicationRepository.save(communication);

        log.info("Communication {} status updated: {} → {}",
                communicationId, previousStatus, newStatus);
    }
}
