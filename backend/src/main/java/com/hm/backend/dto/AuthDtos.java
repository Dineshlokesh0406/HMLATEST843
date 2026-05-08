package com.hm.backend.dto;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
        String fullName,
        String email,
        String countryCode,
        String phoneNumber,
        String address,
        String username,
        String password,
        String confirmPassword
    ) {
    }

    public record LoginRequest(String role, String usernameOrEmail, String password) {
    }

    public record AuthResponse(
        String message,
        String userCode,
        String fullName,
        String email,
        String role
    ) {
    }
}
