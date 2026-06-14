package com.xeno.minicrm.controller;

import com.xeno.minicrm.dto.CampaignLaunchRequest;
import com.xeno.minicrm.entity.Campaign;
import com.xeno.minicrm.entity.Communication;
import com.xeno.minicrm.repository.CampaignRepository;
import com.xeno.minicrm.service.CampaignAiService;
import com.xeno.minicrm.service.CampaignExecutionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * REST API controller exposing the AI-powered campaign generation engine
 * and the campaign execution pipeline.
 *
 * <p>Endpoints:</p>
 * <ul>
 *   <li>{@code GET  /api/campaigns}       — List all campaigns with communication stats</li>
 *   <li>{@code POST /api/campaigns/draft}  — AI generates a campaign draft from a plain-English prompt</li>
 *   <li>{@code POST /api/campaigns/launch} — Executes a campaign: saves it, segments customers,
 *       creates communications, and dispatches messages to the Node.js channel service</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@Slf4j
public class CampaignController {

    private final CampaignAiService campaignAiService;
    private final CampaignExecutionService campaignExecutionService;
    private final CampaignRepository campaignRepository;

    /**
     * Lists all campaigns with aggregated communication statistics.
     *
     * <p>Returns a JSON array where each campaign object includes:
     * id, name, targetAudienceDescription, createdAt, audienceSize,
     * sentCount, deliveredCount, failedCount, and channel.</p>
     *
     * @return list of campaign summary objects
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listCampaigns() {
        List<Campaign> campaigns = campaignRepository.findAll();

        List<Map<String, Object>> result = campaigns.stream().map(c -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", c.getId());
            dto.put("name", c.getName());
            dto.put("targetAudienceDescription", c.getTargetAudienceDescription());
            dto.put("createdAt", c.getCreatedAt());

            // Aggregate communication stats
            List<Communication> comms = c.getCommunications();
            dto.put("audienceSize", comms.size());

            long sent = comms.stream()
                    .filter(comm -> comm.getStatus() != null &&
                            !comm.getStatus().name().equals("PENDING"))
                    .count();
            dto.put("sentCount", sent);

            long delivered = comms.stream()
                    .filter(comm -> comm.getStatus() != null &&
                            Set.of("DELIVERED", "OPENED", "READ", "CLICKED")
                               .contains(comm.getStatus().name()))
                    .count();
            dto.put("deliveredCount", delivered);

            long failed = comms.stream()
                    .filter(comm -> comm.getStatus() != null &&
                            comm.getStatus().name().equals("FAILED"))
                    .count();
            dto.put("failedCount", failed);

            String channel = comms.stream()
                    .filter(comm -> comm.getChannelType() != null)
                    .collect(Collectors.groupingBy(comm -> comm.getChannelType().name(), Collectors.counting()))
                    .entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse("—");
            dto.put("channel", channel);

            dto.put("messageBody", c.getMessageBody());

            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Generates a campaign draft from a plain-English prompt.
     *
     * <p>Request body:</p>
     * <pre>{ "prompt": "Re-engage customers who haven't bought in 6 months" }</pre>
     *
     * <p>Response: structured JSON with campaign_name, segment_size,
     * targeting_criteria, and 3 message_variants.</p>
     *
     * @param request map containing a "prompt" key
     * @return AI-generated campaign draft as JSON
     */
    @PostMapping("/draft")
    public ResponseEntity<String> generateDraft(@RequestBody Map<String, String> request) {
        String prompt = request.get("prompt");

        if (prompt == null || prompt.isBlank()) {
            log.warn("Campaign draft request rejected — empty prompt");
            return ResponseEntity.badRequest().body("{\"error\": \"prompt is required\"}");
        }

        log.info("Campaign draft requested: {}", prompt);
        String draft = campaignAiService.generateCampaignDraft(prompt);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(draft);
    }

    /**
     * Launches a campaign: saves it, resolves the customer segment,
     * creates communication records, and dispatches messages to the
     * Node.js channel service simulator.
     *
     * <p>Request body:</p>
     * <pre>
     * {
     *   "campaign_name": "Summer Re-Engagement",
     *   "targeting_criteria": "no_purchase_since",
     *   "targeting_value": "2026-01-01T00:00:00",
     *   "channel_type": "WHATSAPP",
     *   "message_body": "Hey! We miss you — here's 20% off!"
     * }
     * </pre>
     *
     * <p>Response: JSON summary with campaign_id, segment_size, sent count, failed count.</p>
     *
     * @param request the campaign launch parameters
     * @return execution summary
     */
    @PostMapping("/launch")
    public ResponseEntity<Map<String, Object>> launchCampaign(@RequestBody CampaignLaunchRequest request) {
        if (request.getCampaignName() == null || request.getCampaignName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "campaign_name is required"));
        }
        if (request.getTargetingCriteria() == null || request.getTargetingCriteria().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "targeting_criteria is required"));
        }
        if (request.getChannelType() == null || request.getChannelType().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "channel_type is required"));
        }

        log.info("Campaign launch requested: '{}'", request.getCampaignName());

        try {
            Map<String, Object> result = campaignExecutionService.launchCampaign(request);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.error("Campaign launch failed — bad input: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Campaign launch failed — unexpected error", e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Campaign execution failed: " + e.getMessage()
            ));
        }
    }
}

