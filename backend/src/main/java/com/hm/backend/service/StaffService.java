package com.hm.backend.service;

import com.hm.backend.dto.ApiResponse;
import com.hm.backend.dto.ComplaintDtos.ComplaintResponse;
import com.hm.backend.dto.ComplaintDtos.ComplaintUpdateRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StaffService {

    private final AdminService adminService;

    public StaffService(AdminService adminService) {
        this.adminService = adminService;
    }

    public List<ComplaintResponse> complaints() {
        return adminService.complaints();
    }

    public ApiResponse updateComplaint(String complaintCode, ComplaintUpdateRequest request) {
        return adminService.updateComplaint(complaintCode, request);
    }
}
