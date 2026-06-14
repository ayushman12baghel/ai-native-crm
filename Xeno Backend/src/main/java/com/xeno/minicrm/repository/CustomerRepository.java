package com.xeno.minicrm.repository;

import com.xeno.minicrm.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link Customer} entities.
 * Contains custom segmentation queries used by the AI tool-calling pipeline.
 *
 * <p><strong>Security note:</strong> All queries use parameterized JPQL —
 * inputs are always bound via {@code @Param}, never concatenated, making
 * SQL injection structurally impossible.</p>
 */
@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    /**
     * Finds customers who have NOT placed any order since the given date.
     * Useful for identifying lapsed/dormant customers for re-engagement campaigns.
     *
     * <p>Logic: select customers where no order exists with {@code created_at >= date}.</p>
     *
     * @param date the cutoff date — customers with no orders on or after this date are returned
     * @return list of dormant customers
     */
    @Query("SELECT c FROM Customer c WHERE c.id NOT IN " +
           "(SELECT DISTINCT o.customer.id FROM Order o WHERE o.createdAt >= :date)")
    List<Customer> findCustomersByNoPurchasesSince(@Param("date") LocalDateTime date);

    /**
     * Finds customers whose TOTAL lifetime order value is
     * greater than or equal to the given threshold.
     * Useful for identifying high-value VIP customers based on total spend.
     *
     * @param threshold the minimum total order value (inclusive)
     * @return list of high-value customers
     */
    @Query("SELECT c FROM Customer c WHERE (SELECT COALESCE(SUM(o.orderValue), 0) FROM Order o WHERE o.customer = c) >= :threshold")
    List<Customer> findCustomersByMinimumOrderValue(@Param("threshold") BigDecimal threshold);
}
