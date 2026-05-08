package com.hm.backend.controller;

import com.hm.backend.dto.ApiResponse;
import com.hm.backend.dto.BookingDtos.BookingCreateRequest;
import com.hm.backend.dto.BookingDtos.BookingResponse;
import com.hm.backend.dto.BookingDtos.BookingUpdateRequest;
import com.hm.backend.dto.CatalogDtos.CityOption;
import com.hm.backend.dto.CatalogDtos.HotelOption;
import com.hm.backend.dto.ComplaintDtos.ComplaintCreateRequest;
import com.hm.backend.dto.ComplaintDtos.ComplaintResponse;
import com.hm.backend.dto.ComplaintDtos.ComplaintUpdateRequest;
import com.hm.backend.dto.RoomDtos.RoomResponse;
import com.hm.backend.dto.RoomDtos.RoomSearchRequest;
import com.hm.backend.dto.UserDtos.ProfileUpdateRequest;
import com.hm.backend.dto.UserDtos.UserSummary;
import com.hm.backend.service.CustomerService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping("/profile/{userCode}")
    public UserSummary profile(@PathVariable String userCode) {
        return customerService.getProfile(userCode);
    }

    @PutMapping("/profile/{userCode}")
    public ApiResponse updateProfile(@PathVariable String userCode, @RequestBody ProfileUpdateRequest request) {
        return customerService.updateProfile(userCode, request);
    }

    @GetMapping("/cities")
    public List<CityOption> cities() {
        return customerService.cities();
    }

    @GetMapping("/hotels/{cityCode}")
    public List<HotelOption> hotels(@PathVariable String cityCode) {
        return customerService.hotels(cityCode);
    }

    @GetMapping("/rooms/availability")
    public List<RoomResponse> browseRooms(
        @RequestParam(required = false) String checkInDate,
        @RequestParam(required = false) String checkOutDate
    ) {
        return customerService.browseRooms(checkInDate, checkOutDate);
    }

    @PostMapping("/rooms/search")
    public List<RoomResponse> searchRooms(@RequestBody RoomSearchRequest request) {
        return customerService.searchRooms(request);
    }

    @GetMapping("/bookings/{customerCode}")
    public List<BookingResponse> bookings(@PathVariable String customerCode) {
        return customerService.getBookings(customerCode);
    }

    @PostMapping("/bookings")
    public ApiResponse createBooking(@RequestBody BookingCreateRequest request) {
        return customerService.createBooking(request);
    }

    @PutMapping("/bookings/{bookingCode}")
    public ApiResponse updateBooking(@PathVariable String bookingCode, @RequestBody BookingUpdateRequest request) {
        return customerService.updateBooking(bookingCode, request);
    }

    @PostMapping("/bookings/{bookingCode}/cancel")
    public ApiResponse cancelBooking(@PathVariable String bookingCode) {
        return customerService.cancelBooking(bookingCode);
    }

    @GetMapping("/complaints/{customerCode}")
    public List<ComplaintResponse> complaints(@PathVariable String customerCode) {
        return customerService.getComplaints(customerCode);
    }

    @PostMapping("/complaints")
    public ApiResponse createComplaint(@RequestBody ComplaintCreateRequest request) {
        return customerService.createComplaint(request);
    }

    @PatchMapping("/complaints/{complaintCode}")
    public ApiResponse updateComplaint(@PathVariable String complaintCode, @RequestBody ComplaintUpdateRequest request) {
        return customerService.updateComplaintStatus(complaintCode, request);
    }
}
