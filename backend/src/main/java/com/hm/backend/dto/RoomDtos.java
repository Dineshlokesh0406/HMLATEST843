package com.hm.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public final class RoomDtos {

    private RoomDtos() {
    }

    public record RoomSearchRequest(
        String cityCode,
        String hotelCode,
        String checkInDate,
        String checkOutDate,
        Integer adults,
        Integer children,
        String roomType
    ) {
    }

    public record RoomResponse(
        String cityCode,
        String cityName,
        String hotelCode,
        String hotelName,
        String roomNumber,
        String roomType,
        String bedType,
        BigDecimal pricePerNight,
        String roomStatus,
        boolean bookable,
        Integer maxAdults,
        Integer maxChildren,
        Integer sizeSqFt,
        String description,
        List<String> amenities,
        boolean available
    ) {
    }

    public record RoomSaveRequest(
        String hotelCode,
        String roomNumber,
        String roomType,
        String bedType,
        BigDecimal pricePerNight,
        String roomStatus,
        Boolean bookable,
        Integer maxAdults,
        Integer maxChildren,
        Integer sizeSqFt,
        String description
    ) {
    }
}
