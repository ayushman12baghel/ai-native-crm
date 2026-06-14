package com.xeno.minicrm.entity;

import com.xeno.minicrm.entity.enums.ChannelType;
import com.xeno.minicrm.entity.enums.CommunicationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a single communication message sent to a customer as part of a campaign.
 * Tracks delivery status and optionally attributes a conversion order.
 */
@Entity
@Table(name = "communications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Communication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel_type", nullable = false)
    private ChannelType channelType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private CommunicationStatus status = CommunicationStatus.PENDING;

    /**
     * Nullable FK — set only when a customer order is attributed to this communication.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attributed_order_id")
    private Order attributedOrder;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;
}
