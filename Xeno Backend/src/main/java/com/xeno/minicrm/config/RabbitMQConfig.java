package com.xeno.minicrm.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ topology configuration.
 *
 * <pre>
 *  Producer ──▶ webhook.exchange ──(webhook.routing.key)──▶ webhook.receipts
 *                                                                │
 *                                                          (on reject/TTL)
 *                                                                ▼
 *                                            webhook.dlx ──▶ webhook.receipts.dlq
 * </pre>
 *
 * Failed or rejected messages from the main queue are automatically routed
 * to the Dead-Letter Queue via the Dead-Letter Exchange, ensuring no message
 * is silently lost.
 */
@Configuration
public class RabbitMQConfig {

    // --- Main topology ---
    public static final String MAIN_QUEUE = "webhook.receipts";
    public static final String EXCHANGE = "webhook.exchange";
    public static final String ROUTING_KEY = "webhook.routing.key";

    // --- Dead-letter topology ---
    public static final String DLX = "webhook.dlx";
    public static final String DLQ = "webhook.receipts.dlq";
    public static final String DLQ_ROUTING_KEY = "webhook.dlq.routing.key";

    // ========================
    //  Dead-Letter Exchange & Queue  (must be declared first)
    // ========================

    @Bean
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DLX);
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DLQ).build();
    }

    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder
                .bind(deadLetterQueue())
                .to(deadLetterExchange())
                .with(DLQ_ROUTING_KEY);
    }

    // ========================
    //  Main Exchange & Queue
    // ========================

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE);
    }

    /**
     * Main queue with dead-letter routing.
     * On nack/reject (requeue=false), RabbitMQ forwards the message to the DLX
     * which routes it to the DLQ for inspection and retry.
     */
    @Bean
    public Queue mainQueue() {
        return QueueBuilder.durable(MAIN_QUEUE)
                .withArgument("x-dead-letter-exchange", DLX)
                .withArgument("x-dead-letter-routing-key", DLQ_ROUTING_KEY)
                .build();
    }

    @Bean
    public Binding mainBinding() {
        return BindingBuilder
                .bind(mainQueue())
                .to(exchange())
                .with(ROUTING_KEY);
    }

    // ========================
    //  JSON Message Converter
    // ========================

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
