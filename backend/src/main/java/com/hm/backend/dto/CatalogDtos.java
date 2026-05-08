package com.hm.backend.dto;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record CityOption(
        String cityCode,
        String cityName,
        String stateName
    ) {
    }

    public record HotelOption(
        String hotelCode,
        String hotelName,
        String cityCode,
        String cityName
    ) {
    }
}
