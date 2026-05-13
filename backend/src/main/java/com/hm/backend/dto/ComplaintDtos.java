package com.hm.backend.dto;

public final class ComplaintDtos {

    private ComplaintDtos() {
    }

    public record ComplaintCreateRequest(
        String customerCode,
        String bookingCode,
        String category,
        String complaintTitle,
        String complaintDescription,
        String contactPreference
    ) {
    }

    public record ComplaintUpdateRequest(
        String complaintStatus,
        String assignedToUserCode,
        String responseText,
        String resolutionNotes
    ) {
    }

    public record ComplaintResponse(
        String complaintCode,
        String customerCode,
        String bookingCode,
        String category,
        String complaintTitle,
        String complaintDescription,
        String contactPreference,
        String complaintStatus,
        String assignedToUserCode,
        String expectedResolutionDate,
        String responseText,
        String resolutionNotes,
        String createdAt,
        String assignedAt,
        String resolvedAt
    ) {
    }
}
