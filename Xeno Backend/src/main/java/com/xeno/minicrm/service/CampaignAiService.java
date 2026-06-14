package com.xeno.minicrm.service;

import com.xeno.minicrm.config.SegmentationTools;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/**
 * AI-powered campaign generation service.
 *
 * <p>Takes a plain-English marketer goal (e.g., "Re-engage customers who haven't
 * bought in 6 months with a 20% discount offer") and uses Gemini's function-calling
 * capability to:</p>
 * <ol>
 *   <li>Understand the intent and determine which segmentation tool to call</li>
 *   <li>Invoke the appropriate predefined Java function bean (safe, no SQL injection)</li>
 *   <li>Receive the segment data (customer count + IDs)</li>
 *   <li>Generate a structured JSON response with the segment size and 3 personalized message variants</li>
 * </ol>
 */
@Service
@Slf4j
public class CampaignAiService {

    private final ChatClient chatClient;
    private final SegmentationTools segmentationTools;

    public CampaignAiService(ChatClient.Builder chatClientBuilder, SegmentationTools segmentationTools) {
        this.chatClient = chatClientBuilder.build();
        this.segmentationTools = segmentationTools;
    }

    /**
     * Generates a campaign draft using Gemini AI with function calling.
     *
     * @param marketerGoal plain-English description of the campaign objective
     * @return structured JSON string containing segment size and message variants
     */
    public String generateCampaignDraft(String marketerGoal) {
        log.info("Generating campaign draft for goal: {}", marketerGoal);

        String currentDate = java.time.LocalDate.now().toString();
        String systemPrompt = """
                You are a CRM campaign strategist AI. A marketer will describe their campaign goal
                in plain English. Your job is to:
                
                IMPORTANT: Today's date is %s. Calculate any relative dates (like "last 6 months" or "30 days ago") based on today's date.
                
                1. Analyze the goal and determine which customer segment to target.
                2. Use the available tools to query the database and find matching customers.
                   - Use 'findCustomersByNoPurchasesSince' for dormant/inactive/lapsed customer targeting.
                   - Use 'findCustomersByMinimumOrderValue' for high-value/premium customer targeting.
                3. Based on the segment data returned by the tool, generate a campaign draft.
                
                You MUST respond with a valid JSON object in this exact format:
                {
                  "campaign_name": "A short, descriptive campaign name",
                  "segment_size": <number of customers found by the tool>,
                  "targeting_criteria": "EXACTLY 'no_purchase_since' OR 'min_order_value'",
                  "targeting_value": "The exact parameter value used for the tool (e.g., '10000' or '2024-03-01T00:00:00')",
                  "message_variants": [
                    {
                      "variant": "A",
                      "channel": "WHATSAPP or EMAIL or SMS",
                      "subject": "Subject line or greeting",
                      "body": "The full personalized message body"
                    },
                    {
                      "variant": "B",
                      "channel": "WHATSAPP or EMAIL or SMS",
                      "subject": "Subject line or greeting",
                      "body": "The full personalized message body"
                    },
                    {
                      "variant": "C",
                      "channel": "WHATSAPP or EMAIL or SMS",
                      "subject": "Subject line or greeting",
                      "body": "The full personalized message body"
                    }
                  ]
                }
                
                Important rules:
                - Always call a tool first to get real segment data. Never fabricate customer counts.
                - The targeting_criteria field MUST be exactly one of the supported strings: "no_purchase_since" or "min_order_value".
                - The targeting_value field MUST be the exact parameter value you passed to the tool.
                - Do NOT put explanations, paragraphs, or thought processes in the targeting_criteria field. If the user asks for a segment that tools do not support, map it to the closest available tool or default to "min_order_value".
                - Each message variant should use a different channel or a different tone/angle.
                - Make the messages feel personal and compelling, not generic.
                """.formatted(currentDate);

        String response = chatClient.prompt()
                .system(systemPrompt)
                .user(marketerGoal)
                .tools(segmentationTools)
                .call()
                .content();

        log.info("Campaign draft generated successfully");
        return response;
    }
}
