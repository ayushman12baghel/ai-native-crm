package com.xeno.minicrm.repository;

import com.xeno.minicrm.entity.Communication;
import com.xeno.minicrm.entity.enums.CommunicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link Communication} entities.
 * Provides standard CRUD + paging/sorting out of the box.
 */
@Repository
public interface CommunicationRepository extends JpaRepository<Communication, UUID> {

    /**
     * Finds the single most recent communication for a given customer where:
     * <ul>
     *   <li>The status is in the provided list (e.g., DELIVERED, OPENED, READ, CLICKED)</li>
     *   <li>The communication was sent after the given timestamp (lookback window)</li>
     * </ul>
     *
     * <p>The {@code OrderBySentAtDesc} clause ensures that if multiple communications
     * qualify, the most recent one wins — this is the deterministic tiebreaker that
     * prevents double-attribution.</p>
     *
     * <p>{@code findTop} limits the result to a single row.</p>
     *
     * @param customerId the customer UUID
     * @param statuses   qualifying statuses (DELIVERED, OPENED, READ, CLICKED)
     * @param sentAfter  the lookback boundary (e.g., 7 days ago)
     * @return the most recent qualifying communication, or empty if none found
     */
    Optional<Communication> findTopByCustomerIdAndStatusInAndSentAtAfterOrderBySentAtDesc(
            UUID customerId,
            List<CommunicationStatus> statuses,
            LocalDateTime sentAfter
    );
}
