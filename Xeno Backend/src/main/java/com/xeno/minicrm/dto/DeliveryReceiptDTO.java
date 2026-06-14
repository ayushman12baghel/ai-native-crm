package com.xeno.minicrm.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

/**
 * Data Transfer Object for webhook delivery receipt payloads.
 * Maps the incoming JSON from the channel delivery service.
 *
 * Example payload:
 * <pre>
 * {
 *   "communication_id": "a3f1b2c4-...",
 *   "status": "DELIVERED"
 * }
 * </pre>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryReceiptDTO {

    @JsonProperty("communication_id")
    private String communicationId;

    @JsonProperty("status")
    private String status;
}
