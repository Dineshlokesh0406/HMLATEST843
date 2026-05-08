package com.hm.backend.repository;

import com.hm.backend.dto.UserDtos.UserSummary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository {

    private static final RowMapper<UserSummary> USER_SUMMARY_ROW_MAPPER = (rs, rowNum) -> new UserSummary(
        rs.getString("user_code"),
        rs.getString("full_name"),
        rs.getString("email"),
        rs.getString("country_code"),
        rs.getString("phone_number"),
        rs.getString("address_line"),
        rs.getString("username"),
        rs.getString("role"),
        rs.getString("account_status")
    );

    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<UserRecord> findByUsernameOrEmail(String usernameOrEmail) {
        String sql = """
            select user_id, user_code, full_name, email, country_code, phone_number, address_line, username,
                   password_hash, role, account_status, failed_login_attempts, first_login_required
            from users
            where lower(username) = ? or lower(email) = ?
            """;
        List<UserRecord> results = jdbcTemplate.query(sql, (rs, rowNum) -> new UserRecord(
            rs.getLong("user_id"),
            rs.getString("user_code"),
            rs.getString("full_name"),
            rs.getString("email"),
            rs.getString("country_code"),
            rs.getString("phone_number"),
            rs.getString("address_line"),
            rs.getString("username"),
            rs.getString("password_hash"),
            rs.getString("role"),
            rs.getString("account_status"),
            rs.getInt("failed_login_attempts"),
            rs.getBoolean("first_login_required")
        ), usernameOrEmail, usernameOrEmail);
        return results.stream().findFirst();
    }

    public boolean existsByEmail(String email) {
        return exists("select count(*) from users where email = ?", email);
    }

    public boolean existsByPhone(String phoneNumber) {
        return exists("select count(*) from users where phone_number = ?", phoneNumber);
    }

    public boolean existsByUsername(String username) {
        return exists("select count(*) from users where lower(username) = lower(?)", username);
    }

    public String nextCustomerCode() {
        Integer next = jdbcTemplate.queryForObject(
            "select coalesce(max(cast(substring(user_code, 4) as unsigned)), 1000) + 1 from users where user_code like 'CUS%'",
            Integer.class
        );
        return "CUS" + next;
    }

    public void createCustomer(String userCode, String fullName, String email, String countryCode, String phoneNumber,
                               String address, String username, String passwordHash) {
        String sql = """
            insert into users
            (user_code, full_name, email, country_code, phone_number, address_line, username, password_hash, role, account_status, failed_login_attempts, first_login_required)
            values (?, ?, ?, ?, ?, ?, ?, ?, 'CUSTOMER', 'ACTIVE', 0, false)
            """;
        jdbcTemplate.update(sql, userCode, fullName, email, countryCode, phoneNumber, address, username, passwordHash);
    }

    public void updateLoginState(long userId, int failedAttempts, String accountStatus) {
        jdbcTemplate.update(
            "update users set failed_login_attempts = ?, account_status = ? where user_id = ?",
            failedAttempts, accountStatus, userId
        );
    }

    public UserSummary findProfileByCode(String userCode) {
        return jdbcTemplate.queryForObject(
            """
                select user_code, full_name, email, country_code, phone_number, address_line, username, role, account_status
                from users
                where user_code = ?
                """,
            USER_SUMMARY_ROW_MAPPER,
            userCode
        );
    }

    public void updateProfile(String userCode, String fullName, String email, String countryCode, String phoneNumber, String address) {
        jdbcTemplate.update(
            """
                update users
                set full_name = ?, email = ?, country_code = ?, phone_number = ?, address_line = ?
                where user_code = ?
                """,
            fullName, email, countryCode, phoneNumber, address, userCode
        );
    }

    public List<UserSummary> findAllUsers() {
        return jdbcTemplate.query(
            """
                select user_code, full_name, email, country_code, phone_number, address_line, username, role, account_status
                from users
                order by user_id
                """,
            USER_SUMMARY_ROW_MAPPER
        );
    }

    public void updateStatus(String userCode, String status) {
        jdbcTemplate.update("update users set account_status = ? where user_code = ?", status, userCode);
    }

    public Optional<Long> findIdByUserCode(String userCode) {
        List<Long> ids = jdbcTemplate.query("select user_id from users where user_code = ?", (rs, rowNum) -> rs.getLong(1), userCode);
        return ids.stream().findFirst();
    }

    public Optional<String> findUserCodeById(Long userId) {
        if (userId == null) {
            return Optional.empty();
        }
        List<String> userCodes = jdbcTemplate.query("select user_code from users where user_id = ?", (rs, rowNum) -> rs.getString(1), userId);
        return userCodes.stream().findFirst();
    }

    public int countUsers() {
        Integer count = jdbcTemplate.queryForObject("select count(*) from users", Integer.class);
        return count == null ? 0 : count;
    }

    private boolean exists(String sql, String value) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, value);
        return count != null && count > 0;
    }

    public record UserRecord(
        long userId,
        String userCode,
        String fullName,
        String email,
        String countryCode,
        String phoneNumber,
        String addressLine,
        String username,
        String passwordHash,
        String role,
        String accountStatus,
        int failedLoginAttempts,
        boolean firstLoginRequired
    ) {
    }
}
