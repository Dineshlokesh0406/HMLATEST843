package com.hm.backend.repository;

import com.hm.backend.dto.BookingDtos.BookingResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Repository
public class BookingRepository {

    private final JdbcTemplate jdbcTemplate;

    public BookingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String nextBookingCode() {
        Integer next = jdbcTemplate.queryForObject(
            "select coalesce(max(cast(substring(booking_code, 3) as unsigned)), 2000) + 1 from bookings where booking_code like 'BK%'",
            Integer.class
        );
        return "BK" + next;
    }

    public boolean hasOverlap(long roomId, LocalDate checkIn, LocalDate checkOut, String excludeBookingCode) {
        String sql = """
            select count(*)
            from bookings
            where room_id = ?
              and booking_status <> 'CANCELED'
              and (? is null or booking_code <> ?)
              and ? < check_out_date
              and ? > check_in_date
            """;
        Integer count = jdbcTemplate.queryForObject(
            sql,
            Integer.class,
            roomId,
            excludeBookingCode,
            excludeBookingCode,
            Date.valueOf(checkIn),
            Date.valueOf(checkOut)
        );
        return count != null && count > 0;
    }

    public boolean duplicateCustomerBooking(long customerId, long roomId, LocalDate checkIn, LocalDate checkOut) {
        Integer count = jdbcTemplate.queryForObject(
            """
                select count(*)
                from bookings
                where customer_id = ? and room_id = ? and check_in_date = ? and check_out_date = ? and booking_status <> 'CANCELED'
                """,
            Integer.class,
            customerId,
            roomId,
            Date.valueOf(checkIn),
            Date.valueOf(checkOut)
        );
        return count != null && count > 0;
    }

    public void createBooking(String bookingCode, long customerId, long roomId, LocalDate checkIn, LocalDate checkOut, int adults,
                              int children, String paymentMethod, String specialRequests, BigDecimal totalAmount) {
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        BigDecimal baseAmount = totalAmount.divide(BigDecimal.valueOf(1.18), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal taxAmount = totalAmount.subtract(baseAmount);
        jdbcTemplate.update(
            """
                insert into bookings
                (booking_code, customer_id, room_id, check_in_date, check_out_date, adults_count, children_count, booking_status,
                 payment_status, payment_method, special_requests, total_nights, base_amount, tax_amount, discount_amount, total_amount, refund_amount)
                values (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'PAID', ?, ?, ?, ?, ?, 0, ?, 0)
                """,
            bookingCode,
            customerId,
            roomId,
            Date.valueOf(checkIn),
            Date.valueOf(checkOut),
            adults,
            children,
            paymentMethod,
            specialRequests,
            nights,
            baseAmount,
            taxAmount,
            totalAmount
        );
    }

    public List<BookingResponse> findByCustomerCode(String customerCode) {
        return jdbcTemplate.query(baseBookingQuery() + " where u.user_code = ? order by b.booked_at desc", bookingRowMapper(), customerCode);
    }

    public List<BookingResponse> findAllBookings() {
        return jdbcTemplate.query(baseBookingQuery() + " order by b.booked_at desc", bookingRowMapper());
    }

    public void updateBooking(String bookingCode, LocalDate checkIn, LocalDate checkOut, int adults, int children, long roomId) {
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        jdbcTemplate.update(
            """
                update bookings
                set check_in_date = ?, check_out_date = ?, adults_count = ?, children_count = ?, room_id = ?, total_nights = ?
                where booking_code = ?
                """,
            Date.valueOf(checkIn),
            Date.valueOf(checkOut),
            adults,
            children,
            roomId,
            nights,
            bookingCode
        );
    }

    public void cancelBooking(String bookingCode, BigDecimal refundAmount) {
        jdbcTemplate.update(
            """
                update bookings
                set booking_status = 'CANCELED', refund_amount = ?, payment_status = case when ? > 0 then 'REFUNDED' else payment_status end, canceled_at = now()
                where booking_code = ?
                """,
            refundAmount,
            refundAmount,
            bookingCode
        );
    }

    public BookingDetails findBookingDetails(String bookingCode) {
        return jdbcTemplate.queryForObject(
            """
                select b.booking_id, b.booking_code, b.customer_id, b.room_id, r.room_number, r.room_type, r.price_per_night,
                       h.hotel_code, h.hotel_name, c.city_code, c.city_name,
                       b.check_in_date, b.check_out_date, b.adults_count, b.children_count, b.booking_status, b.total_amount
                from bookings b
                join rooms r on r.room_id = b.room_id
                join hotels h on h.hotel_id = r.hotel_id
                join cities c on c.city_id = h.city_id
                where b.booking_code = ?
                """,
            (rs, rowNum) -> new BookingDetails(
                rs.getLong("booking_id"),
                rs.getString("booking_code"),
                rs.getLong("customer_id"),
                rs.getLong("room_id"),
                rs.getString("hotel_code"),
                rs.getString("hotel_name"),
                rs.getString("city_code"),
                rs.getString("city_name"),
                rs.getString("room_number"),
                rs.getString("room_type"),
                rs.getBigDecimal("price_per_night"),
                rs.getDate("check_in_date").toLocalDate(),
                rs.getDate("check_out_date").toLocalDate(),
                rs.getInt("adults_count"),
                rs.getInt("children_count"),
                rs.getString("booking_status"),
                rs.getBigDecimal("total_amount")
            ),
            bookingCode
        );
    }

    public int countBookings() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from bookings", Integer.class);
        return count == null ? 0 : count;
    }

    private org.springframework.jdbc.core.RowMapper<BookingResponse> bookingRowMapper() {
        return (rs, rowNum) -> new BookingResponse(
            rs.getString("booking_code"),
            rs.getString("user_code"),
            rs.getString("full_name"),
            rs.getString("city_code"),
            rs.getString("city_name"),
            rs.getString("hotel_code"),
            rs.getString("hotel_name"),
            rs.getString("room_number"),
            rs.getString("room_type"),
            rs.getTimestamp("booked_at").toLocalDateTime().toLocalDate().toString(),
            rs.getDate("check_in_date").toLocalDate().toString(),
            rs.getDate("check_out_date").toLocalDate().toString(),
            rs.getInt("adults_count"),
            rs.getInt("children_count"),
            rs.getString("booking_status"),
            rs.getString("payment_status"),
            rs.getBigDecimal("total_amount"),
            rs.getString("special_requests"),
            rs.getTimestamp("canceled_at") == null ? null : rs.getTimestamp("canceled_at").toLocalDateTime().toLocalDate().toString()
        );
    }

    private String baseBookingQuery() {
        return """
            select b.booking_code, u.user_code, u.full_name, c.city_code, c.city_name, h.hotel_code, h.hotel_name,
                   r.room_number, r.room_type, b.booked_at,
                   b.check_in_date, b.check_out_date, b.adults_count, b.children_count,
                   b.booking_status, b.payment_status, b.total_amount, b.special_requests, b.canceled_at
            from bookings b
            join users u on u.user_id = b.customer_id
            join rooms r on r.room_id = b.room_id
            join hotels h on h.hotel_id = r.hotel_id
            join cities c on c.city_id = h.city_id
            """;
    }

    public record BookingDetails(
        long bookingId,
        String bookingCode,
        long customerId,
        long roomId,
        String hotelCode,
        String hotelName,
        String cityCode,
        String cityName,
        String roomNumber,
        String roomType,
        BigDecimal pricePerNight,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        int adultsCount,
        int childrenCount,
        String bookingStatus,
        BigDecimal totalAmount
    ) {
    }
}
