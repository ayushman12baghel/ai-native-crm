package com.xeno.minicrm.repository;

import com.xeno.minicrm.entity.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Spring Data JPA repository for {@link Campaign} entities.
 */
@Repository
public interface CampaignRepository extends JpaRepository<Campaign, UUID> {
}
