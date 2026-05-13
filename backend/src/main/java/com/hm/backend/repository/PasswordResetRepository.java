package com.hm.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class PasswordResetRepository {

    private final JdbcTemplate jdbcTemplate;

    public PasswordResetRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void invalidateForUser(long userId) {
        jdbcTemplate.update("update password_reset_tokens set used_at = now() where user_id = ? and used_at is null", userId);
    }

    public void create(long userId, String otpHash, String tokenHash, LocalDateTime expiresAt) {
        jdbcTemplate.update(
            """
                insert into password_reset_tokens (user_id, otp_hash, token_hash, expires_at)
                values (?, ?, ?, ?)
                """,
            userId,
            otpHash,
            tokenHash,
            expiresAt
        );
    }

    public Optional<ResetRecord> findActiveByUserAndOtp(long userId, String otpHash) {
        List<ResetRecord> rows = jdbcTemplate.query(
            """
                select reset_id, user_id, otp_hash, token_hash, expires_at
                from password_reset_tokens
                where user_id = ? and otp_hash = ? and used_at is null and expires_at > now()
                order by reset_id desc
                limit 1
                """,
            (rs, rowNum) -> new ResetRecord(
                rs.getLong("reset_id"),
                rs.getLong("user_id"),
                rs.getString("otp_hash"),
                rs.getString("token_hash"),
                rs.getTimestamp("expires_at").toLocalDateTime()
            ),
            userId,
            otpHash
        );
        return rows.stream().findFirst();
    }

    public Optional<ResetRecord> findActiveByToken(String tokenHash) {
        List<ResetRecord> rows = jdbcTemplate.query(
            """
                select reset_id, user_id, otp_hash, token_hash, expires_at
                from password_reset_tokens
                where token_hash = ? and used_at is null and expires_at > now()
                order by reset_id desc
                limit 1
                """,
            (rs, rowNum) -> new ResetRecord(
                rs.getLong("reset_id"),
                rs.getLong("user_id"),
                rs.getString("otp_hash"),
                rs.getString("token_hash"),
                rs.getTimestamp("expires_at").toLocalDateTime()
            ),
            tokenHash
        );
        return rows.stream().findFirst();
    }

    public void markUsed(long resetId) {
        jdbcTemplate.update("update password_reset_tokens set used_at = now() where reset_id = ?", resetId);
    }

    public record ResetRecord(long resetId, long userId, String otpHash, String tokenHash, LocalDateTime expiresAt) {
    }
}
