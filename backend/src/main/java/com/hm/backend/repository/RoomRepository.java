package com.hm.backend.repository;

import com.hm.backend.dto.RoomDtos.RoomResponse;
import com.hm.backend.dto.RoomDtos.RoomSaveRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Repository
public class RoomRepository {

    private final JdbcTemplate jdbcTemplate;

    public RoomRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<RoomResponse> searchAvailableRooms(LocalDate checkIn, LocalDate checkOut, int adults, int children,
                                                   String cityCode, String hotelCode, String roomType) {
        String sql = """
            select c.city_code, c.city_name, h.hotel_code, h.hotel_name,
                   r.room_number, r.room_type, r.bed_type, r.price_per_night, r.room_status, r.is_bookable,
                   r.max_adults, r.max_children, r.size_sq_ft, r.description_text,
                   group_concat(a.amenity_name order by a.amenity_name separator ', ') as amenities_csv,
                   case
                     when r.room_status = 'AVAILABLE'
                      and r.is_bookable = true
                      and not exists (
                          select 1
                          from bookings b
                          where b.room_id = r.room_id
                            and b.booking_status <> 'CANCELED'
                            and ? < b.check_out_date
                            and ? > b.check_in_date
                      )
                     then true else false
                   end as available
            from rooms r
            join hotels h on h.hotel_id = r.hotel_id
            join cities c on c.city_id = h.city_id
            left join room_amenities ra on ra.room_id = r.room_id
            left join amenities a on a.amenity_id = ra.amenity_id
            where c.city_code = ?
              and (? is null or h.hotel_code = ?)
              and r.room_type = ?
              and r.max_adults >= ?
              and r.max_children >= ?
            group by r.room_id
            order by h.hotel_name, r.price_per_night asc
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new RoomResponse(
            rs.getString("city_code"),
            rs.getString("city_name"),
            rs.getString("hotel_code"),
            rs.getString("hotel_name"),
            rs.getString("room_number"),
            rs.getString("room_type"),
            rs.getString("bed_type"),
            rs.getBigDecimal("price_per_night"),
            rs.getString("room_status"),
            rs.getBoolean("is_bookable"),
            rs.getInt("max_adults"),
            rs.getInt("max_children"),
            rs.getInt("size_sq_ft"),
            rs.getString("description_text"),
            splitAmenities(rs.getString("amenities_csv")),
            rs.getBoolean("available")
        ), Date.valueOf(checkIn), Date.valueOf(checkOut), cityCode, hotelCode, hotelCode, roomType, adults, children);
    }

    public List<RoomResponse> findAllRooms() {
        String sql = """
            select c.city_code, c.city_name, h.hotel_code, h.hotel_name,
                   r.room_number, r.room_type, r.bed_type, r.price_per_night, r.room_status, r.is_bookable,
                   r.max_adults, r.max_children, r.size_sq_ft, r.description_text,
                   group_concat(a.amenity_name order by a.amenity_name separator ', ') as amenities_csv
            from rooms r
            join hotels h on h.hotel_id = r.hotel_id
            join cities c on c.city_id = h.city_id
            left join room_amenities ra on ra.room_id = r.room_id
            left join amenities a on a.amenity_id = ra.amenity_id
            group by r.room_id
            order by c.city_name, h.hotel_name, r.room_number
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new RoomResponse(
            rs.getString("city_code"),
            rs.getString("city_name"),
            rs.getString("hotel_code"),
            rs.getString("hotel_name"),
            rs.getString("room_number"),
            rs.getString("room_type"),
            rs.getString("bed_type"),
            rs.getBigDecimal("price_per_night"),
            rs.getString("room_status"),
            rs.getBoolean("is_bookable"),
            rs.getInt("max_adults"),
            rs.getInt("max_children"),
            rs.getInt("size_sq_ft"),
            rs.getString("description_text"),
            splitAmenities(rs.getString("amenities_csv")),
            "AVAILABLE".equals(rs.getString("room_status")) && rs.getBoolean("is_bookable")
        ));
    }

    public List<RoomResponse> findRoomsForDateRange(LocalDate checkIn, LocalDate checkOut) {
        String sql = """
            select c.city_code, c.city_name, h.hotel_code, h.hotel_name,
                   r.room_number, r.room_type, r.bed_type, r.price_per_night, r.room_status, r.is_bookable,
                   r.max_adults, r.max_children, r.size_sq_ft, r.description_text,
                   group_concat(a.amenity_name order by a.amenity_name separator ', ') as amenities_csv,
                   case
                     when r.room_status = 'AVAILABLE'
                      and r.is_bookable = true
                      and not exists (
                          select 1
                          from bookings b
                          where b.room_id = r.room_id
                            and b.booking_status <> 'CANCELED'
                            and ? < b.check_out_date
                            and ? > b.check_in_date
                      )
                     then true else false
                   end as available
            from rooms r
            join hotels h on h.hotel_id = r.hotel_id
            join cities c on c.city_id = h.city_id
            left join room_amenities ra on ra.room_id = r.room_id
            left join amenities a on a.amenity_id = ra.amenity_id
            group by r.room_id
            order by c.city_name, h.hotel_name, r.room_number
            """;
        return jdbcTemplate.query(sql, (rs, rowNum) -> new RoomResponse(
            rs.getString("city_code"),
            rs.getString("city_name"),
            rs.getString("hotel_code"),
            rs.getString("hotel_name"),
            rs.getString("room_number"),
            rs.getString("room_type"),
            rs.getString("bed_type"),
            rs.getBigDecimal("price_per_night"),
            rs.getString("room_status"),
            rs.getBoolean("is_bookable"),
            rs.getInt("max_adults"),
            rs.getInt("max_children"),
            rs.getInt("size_sq_ft"),
            rs.getString("description_text"),
            splitAmenities(rs.getString("amenities_csv")),
            rs.getBoolean("available")
        ), Date.valueOf(checkIn), Date.valueOf(checkOut));
    }

    public boolean existsByRoomNumber(String roomNumber) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from rooms where room_number = ?", Integer.class, roomNumber);
        return count != null && count > 0;
    }

    public RoomRecord findRoomByNumber(String roomNumber) {
        return jdbcTemplate.queryForObject(
            """
                select r.room_id, h.hotel_code, h.hotel_name, c.city_code, c.city_name,
                       r.room_number, r.room_type, r.price_per_night, r.max_adults, r.max_children, r.room_status, r.is_bookable
                from rooms r
                join hotels h on h.hotel_id = r.hotel_id
                join cities c on c.city_id = h.city_id
                where r.room_number = ?
                """,
            (rs, rowNum) -> new RoomRecord(
                rs.getLong("room_id"),
                rs.getString("hotel_code"),
                rs.getString("hotel_name"),
                rs.getString("city_code"),
                rs.getString("city_name"),
                rs.getString("room_number"),
                rs.getString("room_type"),
                rs.getBigDecimal("price_per_night"),
                rs.getInt("max_adults"),
                rs.getInt("max_children"),
                rs.getString("room_status"),
                rs.getBoolean("is_bookable")
            ),
            roomNumber
        );
    }

    public void saveRoom(RoomSaveRequest request) {
        long hotelId = findHotelIdByCode(request.hotelCode());
        String roomNumber = request.roomNumber();

        if (!roomNumber.isBlank() && existsByRoomNumber(roomNumber)) {
            jdbcTemplate.update(
                """
                    update rooms
                    set hotel_id = ?, room_type = ?, bed_type = ?, price_per_night = ?, room_status = ?, is_bookable = ?,
                        max_adults = ?, max_children = ?, size_sq_ft = ?, description_text = ?
                    where room_number = ?
                    """,
                hotelId, request.roomType(), request.bedType(), request.pricePerNight(), request.roomStatus(), request.bookable(),
                request.maxAdults(), request.maxChildren(), request.sizeSqFt(), request.description(), roomNumber
            );
            return;
        }

        if (roomNumber.isBlank()) {
            roomNumber = nextRoomNumber(request.hotelCode());
        }

        jdbcTemplate.update(
            """
                insert into rooms
                (hotel_id, room_number, room_type, bed_type, price_per_night, room_status, is_bookable, max_adults, max_children, size_sq_ft, description_text)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            hotelId, roomNumber, request.roomType(), request.bedType(), request.pricePerNight(), request.roomStatus(), request.bookable(),
            request.maxAdults(), request.maxChildren(), request.sizeSqFt(), request.description()
        );
    }

    public int countAvailableRooms() {
        Integer count = jdbcTemplate.queryForObject(
            "select count(*) from rooms where room_status = 'AVAILABLE' and is_bookable = true",
            Integer.class
        );
        return count == null ? 0 : count;
    }

    private List<String> splitAmenities(String amenitiesCsv) {
        if (amenitiesCsv == null || amenitiesCsv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(amenitiesCsv.split(",\\s*")).toList();
    }

    private long findHotelIdByCode(String hotelCode) {
        return jdbcTemplate.queryForObject(
            "select hotel_id from hotels where hotel_code = ?",
            Long.class,
            hotelCode
        );
    }

    private String nextRoomNumber(String hotelCode) {
        Integer next = jdbcTemplate.queryForObject(
            """
                select coalesce(max(cast(substring_index(room_number, '-', -1) as unsigned)), 100) + 1
                from rooms
                where room_number like concat(?, '-%')
                """,
            Integer.class,
            hotelCode
        );
        return hotelCode + "-" + (next == null ? 101 : next);
    }

    public record RoomRecord(
        long roomId,
        String hotelCode,
        String hotelName,
        String cityCode,
        String cityName,
        String roomNumber,
        String roomType,
        java.math.BigDecimal pricePerNight,
        int maxAdults,
        int maxChildren,
        String roomStatus,
        boolean bookable
    ) {
    }
}
