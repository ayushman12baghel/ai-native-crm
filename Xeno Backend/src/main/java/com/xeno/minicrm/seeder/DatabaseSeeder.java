package com.xeno.minicrm.seeder;

import com.xeno.minicrm.entity.Campaign;
import com.xeno.minicrm.entity.Communication;
import com.xeno.minicrm.entity.Customer;
import com.xeno.minicrm.entity.Order;
import com.xeno.minicrm.entity.enums.ChannelType;
import com.xeno.minicrm.entity.enums.CommunicationStatus;
import com.xeno.minicrm.repository.CampaignRepository;
import com.xeno.minicrm.repository.CommunicationRepository;
import com.xeno.minicrm.repository.CustomerRepository;
import com.xeno.minicrm.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final CampaignRepository campaignRepository;
    private final CommunicationRepository communicationRepository;

    private static final String[] FIRST_NAMES = {
        "Vikram", "Priya", "Rohan", "Sneha", "Amit", "Rahul", "Neha", 
        "Divya", "Ananya", "Arjun", "Kiran", "Sanjay", "Ritika", "Nisha",
        "Aditi", "Kunal", "Meera", "Ishaan", "Pooja", "Aarav"
    };
    
    private static final String[] LAST_NAMES = {
        "Sharma", "Patel", "Iyer", "Singh", "Reddy", "Nair", "Bose", 
        "Mehta", "Kapoor", "Gupta", "Choudhary", "Menon", "Joshi", "Desai"
    };

    private final Random random = new Random();

    @Override
    @Transactional
    public void run(String... args) {
        if (customerRepository.count() > 0) {
            log.info("[SYSTEM] Old mock data found. Wiping database for fresh UI seeding...");
            communicationRepository.deleteAllInBatch();
            campaignRepository.deleteAllInBatch();
            orderRepository.deleteAllInBatch();
            customerRepository.deleteAllInBatch();
        }

        log.info("[SYSTEM] Seeding 30 explicit scenario customers...");

        List<Customer> customers = new ArrayList<>();

        // Scenario 1: 10 VIP Customers (> 15000 total spend, recently active)
        for (int i = 1; i <= 10; i++) {
            Customer c = createScenarioCustomer("VipUser", i);
            customers.add(c);
            customerRepository.save(c);
            createOrder(c, 25000.0, 10); // 10 days ago
        }

        // Scenario 2: 10 Dormant Customers (No purchase in last 180 days)
        for (int i = 1; i <= 10; i++) {
            Customer c = createScenarioCustomer("DormantUser", i);
            customers.add(c);
            customerRepository.save(c);
            createOrder(c, 3000.0, 200); // 200 days ago
        }

        // Scenario 3: 10 Regular Customers (Recent, but < 15000 spend)
        for (int i = 1; i <= 10; i++) {
            Customer c = createScenarioCustomer("RegularUser", i);
            customers.add(c);
            customerRepository.save(c);
            createOrder(c, 4000.0, 20); // 20 days ago
        }

        // Scenario 4: 10 Customers with NO purchases (Never bought anything)
        for (int i = 1; i <= 10; i++) {
            Customer c = createScenarioCustomer("NoPurchaseUser", i);
            customers.add(c);
            customerRepository.save(c);
            // Intentionally not creating any orders for these customers!
        }

        log.info("[SYSTEM] Seeded 40 customers and orders.");

        // Create 1 dummy campaign so the dashboard isn't completely empty
        Campaign c1 = Campaign.builder()
                .name("Welcome Campaign")
                .targetAudienceDescription("All users")
                .messageBody("Welcome to our platform!")
                .build();
        campaignRepository.save(c1);

        List<Communication> comms = new ArrayList<>();
        generateCampaignStats(comms, c1, customers, ChannelType.WHATSAPP, 15, 0.9, 0.8, 0.1);
        communicationRepository.saveAll(comms);

        log.info("[SYSTEM] Scenario Database Seeding Complete!");
    }

    private Customer createScenarioCustomer(String prefix, int index) {
        String phone = String.format("+91-9%09d", random.nextInt(1000000000));
        return Customer.builder()
                .name(prefix + " " + index)
                .email(prefix.toLowerCase() + index + "@example.com")
                .phone(phone)
                .build();
    }

    private void createOrder(Customer c, double value, int daysAgo) {
        Order o = Order.builder()
                .customer(c)
                .orderValue(BigDecimal.valueOf(value))
                .createdAt(java.time.LocalDateTime.now().minusDays(daysAgo))
                .build();
        orderRepository.save(o);
    }

    /**
     * Helper to randomly assign communication statuses based on funnel drop-off rates.
     */
    private void generateCampaignStats(List<Communication> comms, Campaign campaign, List<Customer> allCustomers, 
                                       ChannelType channel, int targetAudienceSize, 
                                       double deliverRate, double readOpenRate, double clickRate) {
        
        // Shuffle customers to pick a random subset for this campaign
        List<Customer> targetCustomers = new ArrayList<>(allCustomers);
        Collections.shuffle(targetCustomers);
        targetCustomers = targetCustomers.subList(0, Math.min(targetAudienceSize, targetCustomers.size()));

        for (Customer c : targetCustomers) {
            CommunicationStatus status;
            double r = random.nextDouble();
            
            if (r > deliverRate) {
                status = CommunicationStatus.FAILED;
            } else {
                double r2 = random.nextDouble();
                if (r2 < clickRate) {
                    status = CommunicationStatus.CLICKED;
                } else if (r2 < readOpenRate) {
                    status = channel == ChannelType.EMAIL ? CommunicationStatus.OPENED : CommunicationStatus.READ;
                } else {
                    status = CommunicationStatus.DELIVERED;
                }
            }

            comms.add(Communication.builder()
                    .campaign(campaign)
                    .customer(c)
                    .channelType(channel)
                    .status(status)
                    .build());
        }
    }
}
