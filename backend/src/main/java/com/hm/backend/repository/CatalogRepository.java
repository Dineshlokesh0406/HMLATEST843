package com.hm.backend.repository;

import com.hm.backend.dto.CatalogDtos.CityOption;
import com.hm.backend.dto.CatalogDtos.HotelOption;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CatalogRepository {

    private final JdbcTemplate jdbcTemplate;

    public CatalogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CityOption> findCities() {
        return jdbcTemplate.query(
            """
                select city_code, city_name, state_name
                from cities
                order by city_name
                """,
            (rs, rowNum) -> new CityOption(
                rs.getString("city_code"),
                rs.getString("city_name"),
                rs.getString("state_name")
            )
        );
    }

    public List<HotelOption> findHotelsByCity(String cityCode) {
        return jdbcTemplate.query(
            """
                select h.hotel_code, h.hotel_name, c.city_code, c.city_name
                from hotels h
                join cities c on c.city_id = h.city_id
                where c.city_code = ?
                order by h.hotel_name
                """,
            (rs, rowNum) -> new HotelOption(
                rs.getString("hotel_code"),
                rs.getString("hotel_name"),
                rs.getString("city_code"),
                rs.getString("city_name")
            ),
            cityCode
        );
    }
}
