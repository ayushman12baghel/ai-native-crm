package com.xeno.minicrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerIngestRequest {
    private String name;
    private String email;
    private String phone;
    private BigDecimal initialOrderValue; // Optional initial order value
}
