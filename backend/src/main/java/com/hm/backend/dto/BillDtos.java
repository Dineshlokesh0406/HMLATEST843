package com.hm.backend.dto;

import java.math.BigDecimal;

public final class BillDtos {

    private BillDtos() {
    }

    public record BillCreateRequest(
        String customerCode,
        String bookingCode,
        BigDecimal roomCharges,
        BigDecimal serviceCharges,
        BigDecimal taxAmount,
        BigDecimal discountAmount,
        String paymentStatus,
        String notes
    ) {
    }

    public record BillResponse(
        String billNumber,
        String customerCode,
        String bookingCode,
        BigDecimal roomCharges,
        BigDecimal serviceCharges,
        BigDecimal taxAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String paymentStatus,
        String issueDate,
        String notes
    ) {
    }
}
