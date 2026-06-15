package com.xeno.minicrm.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkIngestRequest {
    private List<CustomerIngestRequest> customers;
}
