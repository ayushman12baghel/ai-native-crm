package com.xeno.minicrm.service;

import com.xeno.minicrm.dto.CampaignLaunchRequest;
import com.xeno.minicrm.entity.Campaign;
import com.xeno.minicrm.entity.Communication;
import com.xeno.minicrm.entity.Customer;
import com.xeno.minicrm.entity.enums.ChannelType;
import com.xeno.minicrm.entity.enums.CommunicationStatus;
import com.xeno.minicrm.repository.CampaignRepository;
import com.xeno.minicrm.repository.CommunicationRepository;
import com.xeno.minicrm.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Orchestrates the full campaign execution pipeline:
 * <ol>
 *   <li>Saves the campaign to the database</li>
 *   <li>Re-fetches the targeted customer segment using the same query the AI used</li>
 *   <li>Creates a PENDING communication record for each customer</li>
 *   <li>Dispatches each message to the Node.js channel simulator</li>
 *   <li>Updates communication status to SENT or FAILED based on the response</li>
 * </ol>
 *
 * <p>This is the bridge between the AI-generated draft and the Node.js webhook loop.
 * The Node.js service will asynchronously call back our webhook with delivery receipts.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignExecutionService {

    private final CampaignRepository campaignRepository;
    private final CustomerRepository customerRepository;
    private final CommunicationRepository communicationRepository;
    private final RestTemplate restTemplate;

    /**
     * Node.js channel simulator endpoint.
     */
    @org.springframework.beans.factory.annotation.Value("${app.channel.service-url}")
    private String channelServiceUrl;

    /**
     * Launches a campaign: saves it, resolves the segment, creates communications,
     * and dispatches messages to the channel service.
     *
     * @param request the launch request from the React frontend
     * @return a summary map with campaign ID, segment size, sent/failed counts
     */
    public Map<String, Object> launchCampaign(CampaignLaunchRequest request) {
        log.info("Launching campaign: name='{}', criteria='{}', channel='{}'",
                request.getCampaignName(), request.getTargetingCriteria(), request.getChannelType());

        // --- Step 1: Save the Campaign ---
        Campaign campaign = Campaign.builder()
                .name(request.getCampaignName())
                .targetAudienceDescription(request.getTargetingCriteria() + ":" + request.getTargetingValue())
                .messageBody(request.getMessageBody())
                .build();
        campaign = campaignRepository.save(campaign);
        log.info("Campaign saved: id={}", campaign.getId());

        // --- Step 2: Fetch the targeted customers ---
        List<Customer> targetedCustomers = resolveSegment(
                request.getTargetingCriteria(),
                request.getTargetingValue()
        );
        log.info("Segment resolved: {} customers found", targetedCustomers.size());

        if (targetedCustomers.isEmpty()) {
            log.warn("No customers matched the targeting criteria — campaign has no audience");
            Map<String, Object> result = new HashMap<>();
            result.put("campaign_id", campaign.getId().toString());
            result.put("campaign_name", campaign.getName());
            result.put("segment_size", 0);
            result.put("sent", 0);
            result.put("failed", 0);
            result.put("message", "No customers matched the targeting criteria");
            return result;
        }

        // --- Step 3 & 4: Create communications and dispatch ---
        ChannelType channelType = ChannelType.valueOf(request.getChannelType().toUpperCase());
        int sentCount = 0;
        int failedCount = 0;

        for (Customer customer : targetedCustomers) {
            // Create PENDING communication
            Communication comm = Communication.builder()
                    .campaign(campaign)
                    .customer(customer)
                    .channelType(channelType)
                    .status(CommunicationStatus.PENDING)
                    .build();
            comm = communicationRepository.save(comm);

            // Dispatch to Node.js channel service
            try {
                Map<String, String> payload = new HashMap<>();
                payload.put("communication_id", comm.getId().toString());
                payload.put("channel_type", channelType.name());
                payload.put("recipient", resolveRecipient(customer, channelType));
                payload.put("message", request.getMessageBody());

                restTemplate.postForEntity(channelServiceUrl, payload, String.class);

                // Mark as SENT on successful dispatch
                comm.setStatus(CommunicationStatus.SENT);
                communicationRepository.save(comm);
                sentCount++;

                log.info("Message dispatched: comm_id={}, customer={}, channel={}",
                        comm.getId(), customer.getName(), channelType);

            } catch (Exception e) {
                // Mark as FAILED on error
                comm.setStatus(CommunicationStatus.FAILED);
                communicationRepository.save(comm);
                failedCount++;

                log.error("Failed to dispatch message: comm_id={}, customer={}, error={}",
                        comm.getId(), customer.getName(), e.getMessage());
            }
        }

        log.info("Campaign '{}' execution complete: {} sent, {} failed out of {} total",
                campaign.getName(), sentCount, failedCount, targetedCustomers.size());

        // --- Build response summary ---
        Map<String, Object> result = new HashMap<>();
        result.put("campaign_id", campaign.getId().toString());
        result.put("campaign_name", campaign.getName());
        result.put("segment_size", targetedCustomers.size());
        result.put("sent", sentCount);
        result.put("failed", failedCount);
        return result;
    }

    /**
     * Re-executes the segmentation query to fetch the targeted customers.
     * Uses the same repository methods the AI's tools call.
     *
     * @param criteria the segmentation strategy ("no_purchase_since" or "min_order_value")
     * @param value    the parameter value for the query
     * @return the list of matching customers
     */
    private List<Customer> resolveSegment(String criteria, String value) {
        return switch (criteria.toLowerCase()) {
            case "no_purchase_since" -> {
                LocalDateTime date = LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                yield customerRepository.findCustomersByNoPurchasesSince(date);
            }
            case "min_order_value" -> {
                BigDecimal threshold = new BigDecimal(value);
                yield customerRepository.findCustomersByMinimumOrderValue(threshold);
            }
            default -> throw new IllegalArgumentException(
                    "Unknown targeting criteria: '" + criteria + "'. " +
                    "Supported: 'no_purchase_since', 'min_order_value'");
        };
    }

    /**
     * Resolves the correct contact info based on the channel type.
     *
     * @param customer    the customer entity
     * @param channelType the communication channel
     * @return the recipient address (email, phone, etc.)
     */
    private String resolveRecipient(Customer customer, ChannelType channelType) {
        return switch (channelType) {
            case EMAIL -> customer.getEmail() != null ? customer.getEmail() : "no-email@placeholder.com";
            case WHATSAPP, SMS -> customer.getPhone() != null ? customer.getPhone() : "+00000000000";
        };
    }
}
