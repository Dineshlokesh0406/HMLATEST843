package com.hm.backend.util;

import com.hm.backend.exception.ApiException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class ValidationUtils {

    private ValidationUtils() {
    }

    public static String requireTrimmed(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new ApiException(fieldName + " is required.");
        }
        return value.trim();
    }

    public static String normalizeEmail(String email) {
        String normalized = requireTrimmed(email, "Email").toLowerCase();
        if (!normalized.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            throw new ApiException("Enter a valid email address.");
        }
        return normalized;
    }

    public static String validateFullName(String fullName) {
        String normalized = requireTrimmed(fullName, "Full name");
        if (!normalized.matches("^[A-Za-z ]{3,}$")) {
            throw new ApiException("Name must be at least 3 characters long and contain only letters.");
        }
        return normalized;
    }

    public static String validatePhone(String phone) {
        String normalized = requireTrimmed(phone, "Phone number");
        if (!normalized.matches("^[6-9]\\d{7,9}$")) {
            throw new ApiException("Enter a valid Indian mobile number starting with 6 to 9.");
        }
        return normalized;
    }

    public static String validatePassword(String password) {
        String normalized = requireTrimmed(password, "Password");
        if (!normalized.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$")) {
            throw new ApiException("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
        }
        return normalized;
    }

    public static void validateDateRange(LocalDate checkIn, LocalDate checkOut) {
        LocalDate today = LocalDate.now();
        if (checkIn.isBefore(today)) {
            throw new ApiException("Check-in date cannot be in the past.");
        }
        if (!checkIn.isBefore(checkOut)) {
            throw new ApiException("Check-out date must be after the check-in date.");
        }
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights > 14) {
            throw new ApiException("Booking duration cannot be more than 14 days.");
        }
    }

    public static int requirePositiveGuests(Integer guests) {
        if (guests == null || guests <= 0) {
            throw new ApiException("At least one guest must be selected.");
        }
        return guests;
    }

    public static void requirePositiveAmount(BigDecimal amount, String fieldName) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(fieldName + " must be greater than zero.");
        }
    }
}
