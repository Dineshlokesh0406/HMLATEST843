package com.hm.backend.repository;

import com.hm.backend.dto.BillDtos.BillResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class BillRepository {

    private final JdbcTemplate jdbcTemplate;

    public BillRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String nextBillNumber() {
        Integer next = jdbcTemplate.queryForObject(
            "select coalesce(max(cast(substring(bill_number, 5) as unsigned)), 4000) + 1 from bills where bill_number like 'BILL%'",
            Integer.class
        );
        return "BILL" + next;
    }

    public void createBill(String billNumber, Long bookingId, long customerId, BigDecimal roomCharges, BigDecimal serviceCharges,
                           BigDecimal taxAmount, BigDecimal discountAmount, BigDecimal totalAmount, String paymentStatus, String notes) {
        jdbcTemplate.update(
            """
                insert into bills
                (bill_number, booking_id, customer_id, room_charges, service_charges, tax_amount, discount_amount, total_amount, payment_status, notes)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            billNumber,
            bookingId,
            customerId,
            roomCharges,
            serviceCharges,
            taxAmount,
            discountAmount,
            totalAmount,
            paymentStatus,
            notes
        );
    }

    public List<BillResponse> findAllBills() {
        return jdbcTemplate.query(
            """
                select bi.bill_number, u.user_code, b.booking_code, bi.room_charges, bi.service_charges,
                       bi.tax_amount, bi.discount_amount, bi.total_amount, bi.payment_status, bi.issue_date, bi.notes
                from bills bi
                join users u on u.user_id = bi.customer_id
                left join bookings b on b.booking_id = bi.booking_id
                order by bi.issue_date desc
                """,
            (rs, rowNum) -> new BillResponse(
                rs.getString("bill_number"),
                rs.getString("user_code"),
                rs.getString("booking_code"),
                rs.getBigDecimal("room_charges"),
                rs.getBigDecimal("service_charges"),
                rs.getBigDecimal("tax_amount"),
                rs.getBigDecimal("discount_amount"),
                rs.getBigDecimal("total_amount"),
                rs.getString("payment_status"),
                rs.getTimestamp("issue_date").toLocalDateTime().toString(),
                rs.getString("notes")
            )
        );
    }
}
