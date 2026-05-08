package com.hm.backend.repository;

import com.hm.backend.dto.ComplaintDtos.ComplaintResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

@Repository
public class ComplaintRepository {

    private final JdbcTemplate jdbcTemplate;

    public ComplaintRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String nextComplaintCode() {
        Integer next = jdbcTemplate.queryForObject(
            "select coalesce(max(cast(substring(complaint_code, 4) as unsigned)), 3000) + 1 from complaints where complaint_code like 'CMP%'",
            Integer.class
        );
        return "CMP" + next;
    }

    public void createComplaint(String complaintCode, long customerId, Long bookingId, String category, String title,
                                String description, String contactPreference, LocalDate expectedResolutionDate) {
        jdbcTemplate.update(
            """
                insert into complaints
                (complaint_code, customer_id, booking_id, category, complaint_title, complaint_description, contact_preference,
                 complaint_status, expected_resolution_date)
                values (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
                """,
            complaintCode,
            customerId,
            bookingId,
            category,
            title,
            description,
            contactPreference,
            Date.valueOf(expectedResolutionDate)
        );
    }

    public List<ComplaintResponse> findByCustomerCode(String customerCode) {
        return jdbcTemplate.query(baseComplaintQuery() + " where cu.user_code = ? order by c.created_at desc", mapper(), customerCode);
    }

    public List<ComplaintResponse> findAllComplaints() {
        return jdbcTemplate.query(baseComplaintQuery() + " order by c.created_at desc", mapper());
    }

    public void updateComplaint(String complaintCode, String status, Long assignedTo, String responseText, String resolutionNotes) {
        jdbcTemplate.update(
            """
                update complaints
                set complaint_status = ?, assigned_to = ?, response_text = ?, resolution_notes = ?,
                    closed_at = case when ? = 'CLOSED' then now() else closed_at end
                where complaint_code = ?
                """,
            status,
            assignedTo,
            responseText,
            resolutionNotes,
            status,
            complaintCode
        );
    }

    public int countOpenComplaints() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from complaints where complaint_status <> 'CLOSED'", Integer.class);
        return count == null ? 0 : count;
    }

    private org.springframework.jdbc.core.RowMapper<ComplaintResponse> mapper() {
        return (rs, rowNum) -> new ComplaintResponse(
            rs.getString("complaint_code"),
            rs.getString("customer_code"),
            rs.getString("booking_code"),
            rs.getString("category"),
            rs.getString("complaint_title"),
            rs.getString("complaint_description"),
            rs.getString("contact_preference"),
            rs.getString("complaint_status"),
            rs.getString("assigned_to_user_code"),
            rs.getDate("expected_resolution_date") == null ? null : rs.getDate("expected_resolution_date").toLocalDate().toString(),
            rs.getString("response_text"),
            rs.getString("resolution_notes")
        );
    }

    private String baseComplaintQuery() {
        return """
            select c.complaint_code, cu.user_code as customer_code, b.booking_code, c.category, c.complaint_title,
                   c.complaint_description, c.contact_preference, c.complaint_status, au.user_code as assigned_to_user_code,
                   c.expected_resolution_date, c.response_text, c.resolution_notes
            from complaints c
            join users cu on cu.user_id = c.customer_id
            left join bookings b on b.booking_id = c.booking_id
            left join users au on au.user_id = c.assigned_to
            """;
    }
}
