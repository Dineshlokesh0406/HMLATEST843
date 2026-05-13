package com.hm.backend.controller;

import com.hm.backend.dto.ApiResponse;
import com.hm.backend.dto.BillDtos.BillCreateRequest;
import com.hm.backend.dto.BillDtos.BillResponse;
import com.hm.backend.dto.BookingDtos.BookingCreateRequest;
import com.hm.backend.dto.BookingDtos.BookingResponse;
import com.hm.backend.dto.CatalogDtos.CityOption;
import com.hm.backend.dto.CatalogDtos.HotelOption;
import com.hm.backend.dto.ComplaintDtos.ComplaintResponse;
import com.hm.backend.dto.ComplaintDtos.ComplaintUpdateRequest;
import com.hm.backend.dto.DashboardDtos.AdminDashboardResponse;
import com.hm.backend.dto.RoomDtos.RoomResponse;
import com.hm.backend.dto.RoomDtos.RoomSaveRequest;
import com.hm.backend.dto.UserDtos.UserStatusUpdateRequest;
import com.hm.backend.dto.UserDtos.UserSummary;
import com.hm.backend.dto.PageResponse;
import com.hm.backend.service.AdminService;
import com.hm.backend.service.PdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final PdfService pdfService;

    public AdminController(AdminService adminService, PdfService pdfService) {
        this.adminService = adminService;
        this.pdfService = pdfService;
    }

    @GetMapping("/dashboard")
    public AdminDashboardResponse dashboard() {
        return adminService.dashboard();
    }

    @GetMapping("/rooms")
    public List<RoomResponse> rooms() {
        return adminService.rooms();
    }

    @GetMapping("/cities")
    public List<CityOption> cities() {
        return adminService.cities();
    }

    @GetMapping("/hotels/{cityCode}")
    public List<HotelOption> hotels(@PathVariable String cityCode) {
        return adminService.hotels(cityCode);
    }

    @PostMapping("/rooms")
    public ApiResponse saveRoom(@RequestBody RoomSaveRequest request) {
        return adminService.saveRoom(request);
    }

    @GetMapping("/reservations")
    public List<BookingResponse> reservations() {
        return adminService.reservations();
    }

    @GetMapping("/reservations/page")
    public PageResponse<BookingResponse> reservationPage(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "bookedAt") String sort,
        @RequestParam(defaultValue = "desc") String direction,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String paymentStatus,
        @RequestParam(required = false) String date
    ) {
        return adminService.reservationPage(page, size, sort, direction, search, status, paymentStatus, date);
    }

    @PostMapping("/reservations")
    public ApiResponse createReservation(@RequestBody BookingCreateRequest request) {
        return adminService.createReservation(request);
    }

    @GetMapping("/users")
    public List<UserSummary> users() {
        return adminService.users();
    }

    @GetMapping("/users/page")
    public PageResponse<UserSummary> userPage(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "userId") String sort,
        @RequestParam(defaultValue = "asc") String direction,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String role
    ) {
        return adminService.userPage(page, size, sort, direction, search, role);
    }

    @PatchMapping("/users/{userCode}/status")
    public ApiResponse updateUserStatus(@PathVariable String userCode, @RequestBody UserStatusUpdateRequest request) {
        return adminService.updateUserStatus(userCode, request);
    }

    @GetMapping("/bills")
    public List<BillResponse> bills() {
        return adminService.bills();
    }

    @PostMapping("/bills")
    public ApiResponse createBill(@RequestBody BillCreateRequest request) {
        return adminService.createBill(request);
    }

    @GetMapping("/complaints")
    public List<ComplaintResponse> complaints() {
        return adminService.complaints();
    }

    @PatchMapping("/complaints/{complaintCode}")
    public ApiResponse updateComplaint(@PathVariable String complaintCode, @RequestBody ComplaintUpdateRequest request) {
        return adminService.updateComplaint(complaintCode, request);
    }

    @GetMapping("/reservations/{bookingCode}/receipt")
    public ResponseEntity<byte[]> bookingReceipt(@PathVariable String bookingCode) {
        byte[] pdf = pdfService.bookingReceipt(bookingCode);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + bookingCode + "-receipt.pdf\"")
            .body(pdf);
    }
}
