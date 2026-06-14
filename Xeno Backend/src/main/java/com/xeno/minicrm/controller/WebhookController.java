package com.xeno.minicrm.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xeno.minicrm.config.RabbitMQConfig;
import com.xeno.minicrm.dto.DeliveryReceiptDTO;
import com.xeno.minicrm.util.WebhookSecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Secure webhook endpoint for receiving delivery receipts from external
 * channel services (WhatsApp, Email, SMS providers).
 *
 * <p>
 * <strong>Authentication:</strong> HMAC-SHA256 signature validation via the
 * {@code X-Hub-Signature-256} header. The raw request body is hashed with the
 * shared secret and compared in constant time to prevent timing attacks.
 * </p>
 *
 * <p>
 * <strong>CRITICAL:</strong> The request body is accepted as a raw
 * {@code String}
 * (not a parsed DTO) to preserve the exact byte sequence for HMAC verification.
 * If Spring were to deserialize the JSON into a DTO and we re-serialized it,
 * whitespace/key-ordering differences would produce a different hash — breaking
 * signature validation.
 * </p>
 *
 * <p>
 * On successful validation, the payload is published to RabbitMQ and
 * the controller immediately returns 202 Accepted. No database writes
 * happen in this layer — all persistence is handled asynchronously by
 * the {@link com.xeno.minicrm.consumer.WebhookConsumer}.
 * </p>
 */
@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final RabbitTemplate rabbitTemplate;
    private final WebhookSecurityUtil webhookSecurityUtil;
    private final ObjectMapper objectMapper;

    @Value("${app.webhook.secret}")
    private String webhookSecret;

    @PostMapping("/receipt")
    public ResponseEntity<String> receiveReceipt(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String hmacSignature,
            @RequestBody String rawBody) {

        // --- HMAC-SHA256 signature validation ---
        if (hmacSignature == null || !webhookSecurityUtil.isValidSignature(rawBody, hmacSignature, webhookSecret)) {
            log.warn("Webhook rejected — invalid or missing HMAC signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
        }

        // --- Parse the raw body into DTO ---
        DeliveryReceiptDTO payload;
        try {
            payload = objectMapper.readValue(rawBody, DeliveryReceiptDTO.class);
        } catch (JsonProcessingException e) {
            log.error("Webhook rejected — malformed JSON body", e);
            return ResponseEntity.badRequest().body("Invalid JSON payload");
        }

        // --- Publish to RabbitMQ and return immediately ---
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.ROUTING_KEY,
                payload);

        log.info("Webhook receipt queued for communication_id={}, status={}",
                payload.getCommunicationId(), payload.getStatus());

        return ResponseEntity.status(HttpStatus.ACCEPTED).body("Accepted");
    }
}
