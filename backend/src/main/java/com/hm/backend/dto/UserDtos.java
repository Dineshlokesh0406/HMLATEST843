package com.hm.backend.dto;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserSummary(
        String userCode,
        String fullName,
        String email,
        String countryCode,
        String phoneNumber,
        String address,
        String username,
        String role,
        String accountStatus
    ) {
    }

    public record ProfileUpdateRequest(
        String fullName,
        String email,
        String countryCode,
        String phoneNumber,
        String address
    ) {
    }

    public record UserStatusUpdateRequest(String accountStatus) {
    }
}
