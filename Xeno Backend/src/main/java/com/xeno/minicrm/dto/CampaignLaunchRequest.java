package com.xeno.minicrm.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

/**
 * DTO for the campaign launch request from the React frontend.
 *
 * <p>Contains the campaign metadata and the segmentation criteria
 * needed to re-fetch the targeted customers and dispatch messages
 * to the Node.js channel service.</p>
 *
 * <p>Example payload:</p>
 * <pre>
 * {
 *   "campaign_name": "Summer Re-Engagement",
 *   "targeting_criteria": "no_purchase_since",
 *   "targeting_value": "2026-01-01T00:00:00",
 *   "channel_type": "WHATSAPP",
 *   "message_body": "Hey! We miss you — here's 20% off your next order!"
 * }
 * </pre>
 *
 * <p><strong>Segmentation re-execution:</strong> The {@code targeting_criteria}
 * field determines which repository query to run, and {@code targeting_value}
 * supplies the parameter. This ensures the launch uses the exact same segment
 * the AI drafted against.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignLaunchRequest {

    /**
     * Human-readable campaign name (e.g., "Summer Re-Engagement 2026").
     */
    @JsonProperty("campaign_name")
    private String campaignName;

    /**
     * The segmentation strategy to use. Supported values:
     * <ul>
     *   <li>{@code "no_purchase_since"} — targets dormant customers</li>
     *   <li>{@code "min_order_value"} — targets high-value customers</li>
     * </ul>
     */
    @JsonProperty("targeting_criteria")
    private String targetingCriteria;

    /**
     * The parameter value for the segmentation query.
     * <ul>
     *   <li>For {@code "no_purchase_since"}: ISO date string (e.g., "2026-01-01T00:00:00")</li>
     *   <li>For {@code "min_order_value"}: decimal string (e.g., "100.00")</li>
     * </ul>
     */
    @JsonProperty("targeting_value")
    private String targetingValue;

    /**
     * The communication channel: WHATSAPP, EMAIL, or SMS.
     */
    @JsonProperty("channel_type")
    private String channelType;

    /**
     * The message body to send to each customer in the segment.
     */
    @JsonProperty("message_body")
    private String messageBody;
}
