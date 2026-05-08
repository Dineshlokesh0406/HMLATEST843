package com.hm.backend.dto;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record AdminDashboardResponse(
        int totalBookings,
        int availableRooms,
        int totalUsers,
        int openComplaints
    ) {
    }
}
