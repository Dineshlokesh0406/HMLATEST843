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
        if (!normalized.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new ApiException("Invalid email format.");
        }
        return normalized;
    }

    public static String validateFullName(String fullName) {
        String normalized = requireTrimmed(fullName, "Full name");
        if (normalized.length() > 50) {
            throw new ApiException("Name cannot exceed 50 characters.");
        }
        if (!normalized.matches("^[A-Za-z ]{3,50}$")) {
            throw new ApiException("Name must contain only alphabetic characters and spaces.");
        }
        return normalized;
    }

    public static String validatePhone(String phone, String countryCode) {
        String normalized = requireTrimmed(phone, "Phone number");
        String code = requireTrimmed(countryCode, "Country code");
        if (!normalized.matches("^\\d+$")) {
            throw new ApiException("Invalid phone number.");
        }
        int expectedLength = switch (code) {
            case "+91" -> 10;
            case "+1" -> 10;
            case "+44" -> 10;
            case "+61" -> 9;
            default -> throw new ApiException("Unsupported country code.");
        };
        if (normalized.length() < expectedLength) {
            throw new ApiException("Phone number too short.");
        }
        if (normalized.length() > expectedLength) {
            throw new ApiException("Phone number too long.");
        }
        if ("+91".equals(code) && !normalized.matches("^[6-9]\\d{9}$")) {
            throw new ApiException("Invalid phone number.");
        }
        return normalized;
    }

    public static String validatePhone(String phone) {
        return validatePhone(phone, "+91");
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
