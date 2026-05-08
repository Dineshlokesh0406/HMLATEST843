package com.hm.backend.controller;

import com.hm.backend.dto.ApiResponse;
import com.hm.backend.dto.ComplaintDtos.ComplaintResponse;
import com.hm.backend.dto.ComplaintDtos.ComplaintUpdateRequest;
import com.hm.backend.service.StaffService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping("/complaints")
    public List<ComplaintResponse> complaints() {
        return staffService.complaints();
    }

    @PatchMapping("/complaints/{complaintCode}")
    public ApiResponse updateComplaint(@PathVariable String complaintCode, @RequestBody ComplaintUpdateRequest request) {
        return staffService.updateComplaint(complaintCode, request);
    }
}
