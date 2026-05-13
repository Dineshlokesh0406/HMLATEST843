-- Hotel Management System
-- Final schema creation script for MySQL 8+
-- Run this file first in MySQL Workbench

DROP DATABASE IF EXISTS hm_pbl;
CREATE DATABASE hm_pbl CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hm_pbl;

SET NAMES utf8mb4;

CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_code VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    country_code VARCHAR(10) NOT NULL DEFAULT '+91',
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    address_line VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash CHAR(64) NOT NULL,
    role ENUM('CUSTOMER', 'ADMIN', 'STAFF') NOT NULL,
    account_status ENUM('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    failed_login_attempts INT NOT NULL DEFAULT 0,
    first_login_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_name CHECK (CHAR_LENGTH(TRIM(full_name)) >= 3),
    CONSTRAINT chk_users_email CHECK (email = LOWER(TRIM(email))),
    CONSTRAINT chk_users_phone CHECK (phone_number REGEXP '^[0-9]{9,10}$')
);

CREATE TABLE cities (
    city_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    city_code VARCHAR(10) NOT NULL UNIQUE,
    city_name VARCHAR(80) NOT NULL UNIQUE,
    state_name VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hotels (
    hotel_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    hotel_code VARCHAR(20) NOT NULL UNIQUE,
    city_id BIGINT NOT NULL,
    hotel_name VARCHAR(120) NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(15) NOT NULL,
    contact_email VARCHAR(150) NOT NULL,
    star_rating INT NOT NULL DEFAULT 4,
    description_text VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_hotels_city
        FOREIGN KEY (city_id) REFERENCES cities(city_id),
    CONSTRAINT chk_hotels_rating CHECK (star_rating BETWEEN 1 AND 5)
);

CREATE TABLE rooms (
    room_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    hotel_id BIGINT NOT NULL,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    room_type VARCHAR(30) NOT NULL,
    bed_type VARCHAR(30) NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    room_status ENUM('AVAILABLE', 'OCCUPIED', 'UNDER_MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    is_bookable BOOLEAN NOT NULL DEFAULT TRUE,
    max_adults INT NOT NULL,
    max_children INT NOT NULL DEFAULT 0,
    size_sq_ft INT NULL,
    description_text VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rooms_hotel
        FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id),
    CONSTRAINT chk_rooms_price CHECK (price_per_night > 0),
    CONSTRAINT chk_rooms_adults CHECK (max_adults > 0),
    CONSTRAINT chk_rooms_children CHECK (max_children >= 0)
);

CREATE TABLE amenities (
    amenity_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    amenity_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE room_amenities (
    room_id BIGINT NOT NULL,
    amenity_id BIGINT NOT NULL,
    PRIMARY KEY (room_id, amenity_id),
    CONSTRAINT fk_room_amenities_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id),
    CONSTRAINT fk_room_amenities_amenity
        FOREIGN KEY (amenity_id) REFERENCES amenities(amenity_id)
);

CREATE TABLE bookings (
    booking_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_code VARCHAR(20) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    adults_count INT NOT NULL,
    children_count INT NOT NULL DEFAULT 0,
    booking_status ENUM('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELED') NOT NULL DEFAULT 'CONFIRMED',
    payment_status ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(30) NULL,
    special_requests VARCHAR(500) NULL,
    total_nights INT NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    canceled_at DATETIME NULL,
    booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_customer
        FOREIGN KEY (customer_id) REFERENCES users(user_id),
    CONSTRAINT fk_bookings_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id),
    CONSTRAINT chk_bookings_dates CHECK (check_in_date < check_out_date),
    CONSTRAINT chk_bookings_duration CHECK (total_nights BETWEEN 1 AND 14),
    CONSTRAINT chk_bookings_adults CHECK (adults_count > 0),
    CONSTRAINT chk_bookings_children CHECK (children_count >= 0),
    CONSTRAINT chk_bookings_amount CHECK (total_amount > 0)
);

CREATE TABLE payments (
    payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    payment_code VARCHAR(20) NOT NULL UNIQUE,
    booking_id BIGINT NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_status ENUM('SUCCESS', 'FAILED', 'PENDING', 'REFUNDED') NOT NULL,
    cardholder_name VARCHAR(100) NULL,
    card_last4 CHAR(4) NULL,
    gateway_reference VARCHAR(50) NULL,
    paid_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    CONSTRAINT chk_payments_amount CHECK (amount_paid > 0)
);

CREATE TABLE bills (
    bill_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_number VARCHAR(20) NOT NULL UNIQUE,
    booking_id BIGINT NULL,
    customer_id BIGINT NOT NULL,
    issue_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    room_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    service_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('PENDING', 'PARTIALLY_PAID', 'PAID') NOT NULL DEFAULT 'PENDING',
    notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bills_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    CONSTRAINT fk_bills_customer
        FOREIGN KEY (customer_id) REFERENCES users(user_id),
    CONSTRAINT chk_bills_total CHECK (total_amount >= 0)
);

CREATE TABLE bill_items (
    bill_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_id BIGINT NOT NULL,
    item_type ENUM('ROOM_CHARGE', 'SERVICE_CHARGE', 'TAX', 'DISCOUNT', 'OTHER') NOT NULL,
    item_description VARCHAR(150) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_bill_items_bill
        FOREIGN KEY (bill_id) REFERENCES bills(bill_id),
    CONSTRAINT chk_bill_items_quantity CHECK (quantity > 0)
);

CREATE TABLE complaints (
    complaint_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    complaint_code VARCHAR(20) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    booking_id BIGINT NULL,
    category ENUM('ROOM_ISSUE', 'SERVICE_ISSUE', 'BILLING_ISSUE', 'OTHER') NOT NULL,
    complaint_title VARCHAR(100) NOT NULL,
    complaint_description VARCHAR(500) NOT NULL,
    contact_preference ENUM('CALL', 'EMAIL') NOT NULL,
    complaint_status ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'PENDING',
    assigned_to BIGINT NULL,
    expected_resolution_date DATE NULL,
    response_text VARCHAR(500) NULL,
    resolution_notes VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    assigned_at DATETIME NULL,
    resolved_at DATETIME NULL,
    closed_at DATETIME NULL,
    CONSTRAINT fk_complaints_customer
        FOREIGN KEY (customer_id) REFERENCES users(user_id),
    CONSTRAINT fk_complaints_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    CONSTRAINT fk_complaints_assigned_to
        FOREIGN KEY (assigned_to) REFERENCES users(user_id),
    CONSTRAINT chk_complaints_title CHECK (CHAR_LENGTH(TRIM(complaint_title)) BETWEEN 10 AND 100),
    CONSTRAINT chk_complaints_description CHECK (CHAR_LENGTH(TRIM(complaint_description)) BETWEEN 20 AND 500)
);

CREATE TABLE complaint_actions (
    action_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    complaint_id BIGINT NOT NULL,
    action_by BIGINT NOT NULL,
    previous_status ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NULL,
    new_status ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL,
    action_note VARCHAR(500) NOT NULL,
    action_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaint_actions_complaint
        FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id),
    CONSTRAINT fk_complaint_actions_user
        FOREIGN KEY (action_by) REFERENCES users(user_id)
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_hotels_city ON hotels(city_id, hotel_name);
CREATE INDEX idx_rooms_hotel_type_status ON rooms(hotel_id, room_type, room_status, is_bookable);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_room_dates ON bookings(room_id, check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(booking_status, payment_status);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_bills_customer ON bills(customer_id);
CREATE INDEX idx_complaints_customer_status ON complaints(customer_id, complaint_status);
CREATE INDEX idx_complaints_assigned_to ON complaints(assigned_to);

CREATE TABLE password_reset_tokens (
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
