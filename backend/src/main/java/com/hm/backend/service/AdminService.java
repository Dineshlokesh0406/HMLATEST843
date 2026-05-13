package com.hm.backend.service;

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
import com.hm.backend.exception.ApiException;
import com.hm.backend.repository.BillRepository;
import com.hm.backend.repository.BookingRepository;
import com.hm.backend.repository.CatalogRepository;
import com.hm.backend.repository.ComplaintRepository;
import com.hm.backend.repository.RoomRepository;
import com.hm.backend.repository.UserRepository;
import com.hm.backend.util.ValidationUtils;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final CatalogRepository catalogRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final ComplaintRepository complaintRepository;
    private final BillRepository billRepository;
    private final CustomerService customerService;

    public AdminService(UserRepository userRepository, CatalogRepository catalogRepository, RoomRepository roomRepository, BookingRepository bookingRepository,
                        ComplaintRepository complaintRepository, BillRepository billRepository, CustomerService customerService) {
        this.userRepository = userRepository;
        this.catalogRepository = catalogRepository;
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
        this.complaintRepository = complaintRepository;
        this.billRepository = billRepository;
        this.customerService = customerService;
    }

    public AdminDashboardResponse dashboard() {
        return new AdminDashboardResponse(
            bookingRepository.countBookings(),
            roomRepository.countAvailableRooms(),
            userRepository.countUsers(),
            complaintRepository.countOpenComplaints()
        );
    }

    public List<RoomResponse> rooms() {
        return roomRepository.findAllRooms();
    }

    public List<CityOption> cities() {
        return catalogRepository.findCities();
    }

    public List<HotelOption> hotels(String cityCode) {
        return catalogRepository.findHotelsByCity(ValidationUtils.requireTrimmed(cityCode, "City"));
    }

    public ApiResponse saveRoom(RoomSaveRequest request) {
        String hotelCode = ValidationUtils.requireTrimmed(request.hotelCode(), "Hotel");
        String roomNumber = request.roomNumber() == null ? "" : request.roomNumber().trim();
        String roomType = ValidationUtils.requireTrimmed(request.roomType(), "Room type");
        String bedType = ValidationUtils.requireTrimmed(request.bedType(), "Bed type");
        ValidationUtils.requirePositiveAmount(request.pricePerNight(), "Room price");

        RoomSaveRequest normalizedRequest = new RoomSaveRequest(
            hotelCode,
            roomNumber,
            roomType,
            bedType,
            request.pricePerNight(),
            request.roomStatus(),
            request.bookable(),
            request.maxAdults(),
            request.maxChildren(),
            request.sizeSqFt(),
            request.description()
        );
        roomRepository.saveRoom(normalizedRequest);
        return new ApiResponse("Room saved successfully.");
    }

    public List<BookingResponse> reservations() {
        return bookingRepository.findAllBookings();
    }

    public PageResponse<BookingResponse> reservationPage(int page, int size, String sort, String direction, String search,
                                                         String status, String paymentStatus, String date) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        String sortColumn = switch (sort) {
            case "bookingCode" -> "b.booking_code";
            case "customer" -> "u.full_name";
            case "room" -> "r.room_number";
            case "status" -> "b.booking_status";
            case "paymentStatus" -> "b.payment_status";
            case "checkIn" -> "b.check_in_date";
            default -> "b.booked_at";
        };
        String sortDirection = "asc".equalsIgnoreCase(direction) ? "asc" : "desc";
        long total = bookingRepository.countBookings(search, status, paymentStatus, date);
        return PageResponse.of(
            bookingRepository.findAllBookingsPage(safeSize, safePage * safeSize, sortColumn, sortDirection, search, status, paymentStatus, date),
            safePage,
            safeSize,
            total
        );
    }

    public ApiResponse createReservation(BookingCreateRequest request) {
        return customerService.createBooking(request);
    }

    public List<UserSummary> users() {
        return userRepository.findAllUsers();
    }

    public PageResponse<UserSummary> userPage(int page, int size, String sort, String direction, String search, String role) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        String sortColumn = switch (sort) {
            case "username" -> "username";
            case "email" -> "email";
            case "role" -> "role";
            case "status" -> "account_status";
            default -> "user_id";
        };
        String sortDirection = "desc".equalsIgnoreCase(direction) ? "desc" : "asc";
        long total = userRepository.countUsers(search, role);
        return PageResponse.of(
            userRepository.findUsersPage(safeSize, safePage * safeSize, sortColumn, sortDirection, search, role),
            safePage,
            safeSize,
            total
        );
    }

    public ApiResponse updateUserStatus(String userCode, UserStatusUpdateRequest request) {
        String status = ValidationUtils.requireTrimmed(request.accountStatus(), "Account status").toUpperCase();
        if (!List.of("ACTIVE", "INACTIVE", "LOCKED").contains(status)) {
            throw new ApiException("Unsupported account status.");
        }
        userRepository.updateStatus(userCode, status);
        return new ApiResponse("User status updated successfully.");
    }

    public List<BillResponse> bills() {
        return billRepository.findAllBills();
    }

    public ApiResponse createBill(BillCreateRequest request) {
        long customerId = userRepository.findIdByUserCode(request.customerCode())
            .orElseThrow(() -> new ApiException("Customer not found."));
        Long bookingId = request.bookingCode() == null || request.bookingCode().isBlank()
            ? null
            : bookingRepository.findBookingDetails(request.bookingCode()).bookingId();

        BigDecimal roomCharges = request.roomCharges() == null ? BigDecimal.ZERO : request.roomCharges();
        BigDecimal serviceCharges = request.serviceCharges() == null ? BigDecimal.ZERO : request.serviceCharges();
        BigDecimal taxAmount = request.taxAmount() == null ? BigDecimal.ZERO : request.taxAmount();
        BigDecimal discountAmount = request.discountAmount() == null ? BigDecimal.ZERO : request.discountAmount();
        BigDecimal totalAmount = roomCharges.add(serviceCharges).add(taxAmount).subtract(discountAmount);
        if (totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException("Bill total cannot be negative.");
        }

        billRepository.createBill(
            billRepository.nextBillNumber(),
            bookingId,
            customerId,
            roomCharges,
            serviceCharges,
            taxAmount,
            discountAmount,
            totalAmount,
            ValidationUtils.requireTrimmed(request.paymentStatus(), "Payment status").toUpperCase(),
            request.notes()
        );
        return new ApiResponse("Bill created successfully.");
    }

    public List<ComplaintResponse> complaints() {
        return complaintRepository.findAllComplaints();
    }

    public ApiResponse updateComplaint(String complaintCode, ComplaintUpdateRequest request) {
        return customerService.updateComplaintStatus(complaintCode, request);
    }
}
