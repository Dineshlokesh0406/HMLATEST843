package com.hm.backend.dto;

import java.math.BigDecimal;

public final class BookingDtos {

    private BookingDtos() {
    }

    public record BookingCreateRequest(
        String customerCode,
        String roomNumber,
        String checkInDate,
        String checkOutDate,
        Integer adults,
        Integer children,
        String paymentMethod,
        String specialRequests
    ) {
    }

    public record BookingUpdateRequest(
        String checkInDate,
        String checkOutDate,
        Integer adults,
        Integer children,
        String roomNumber
    ) {
    }

    public record BookingResponse(
        String bookingCode,
        String customerCode,
        String customerName,
        String cityCode,
        String cityName,
        String hotelCode,
        String hotelName,
        String roomNumber,
        String roomType,
        String bookedDate,
        String checkInDate,
        String checkOutDate,
        Integer adults,
        Integer children,
        String bookingStatus,
        String paymentStatus,
        BigDecimal totalAmount,
        String specialRequests,
        String canceledDate
    ) {
    }
}
