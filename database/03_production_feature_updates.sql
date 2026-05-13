USE hm_pbl;

ALTER TABLE users
    DROP CHECK chk_users_phone;

ALTER TABLE users
    ADD CONSTRAINT chk_users_phone CHECK (phone_number REGEXP '^[0-9]{9,10}$');

ALTER TABLE complaints
    MODIFY complaint_status ENUM('OPEN', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN assigned_at DATETIME NULL AFTER updated_at,
    ADD COLUMN resolved_at DATETIME NULL AFTER assigned_at;

UPDATE complaints SET complaint_status = 'PENDING' WHERE complaint_status = 'OPEN';

ALTER TABLE complaints
    MODIFY complaint_status ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'PENDING';

ALTER TABLE complaint_actions
    MODIFY previous_status ENUM('OPEN', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NULL,
    MODIFY new_status ENUM('OPEN', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL;

UPDATE complaint_actions SET previous_status = 'PENDING' WHERE previous_status = 'OPEN';
UPDATE complaint_actions SET new_status = 'PENDING' WHERE new_status = 'OPEN';

ALTER TABLE complaint_actions
    MODIFY previous_status ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NULL,
    MODIFY new_status ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    reset_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    otp_hash CHAR(64) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_password_reset_user_active ON password_reset_tokens(user_id, used_at, expires_at);
