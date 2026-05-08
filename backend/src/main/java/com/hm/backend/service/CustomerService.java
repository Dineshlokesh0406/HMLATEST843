package com.hm.backend.service;

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
import com.hm.backend.exception.ApiException;
import com.hm.backend.repository.BookingRepository;
import com.hm.backend.repository.BookingRepository.BookingDetails;
import com.hm.backend.repository.CatalogRepository;
import com.hm.backend.repository.ComplaintRepository;
import com.hm.backend.repository.RoomRepository;
import com.hm.backend.repository.RoomRepository.RoomRecord;
import com.hm.backend.repository.UserRepository;
import com.hm.backend.util.ValidationUtils;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class CustomerService {

    private final UserRepository userRepository;
    private final CatalogRepository catalogRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final ComplaintRepository complaintRepository;

    public CustomerService(UserRepository userRepository, CatalogRepository catalogRepository, RoomRepository roomRepository,
                           BookingRepository bookingRepository, ComplaintRepository complaintRepository) {
        this.userRepository = userRepository;
        this.catalogRepository = catalogRepository;
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
        this.complaintRepository = complaintRepository;
    }

    public UserSummary getProfile(String userCode) {
        return userRepository.findProfileByCode(userCode);
    }

    public ApiResponse updateProfile(String userCode, ProfileUpdateRequest request) {
        userRepository.updateProfile(
            userCode,
            ValidationUtils.validateFullName(request.fullName()),
            ValidationUtils.normalizeEmail(request.email()),
            ValidationUtils.requireTrimmed(request.countryCode(), "Country code"),
            ValidationUtils.validatePhone(request.phoneNumber()),
            ValidationUtils.requireTrimmed(request.address(), "Address")
        );
        return new ApiResponse("Your profile has been updated successfully.");
    }

    public List<CityOption> cities() {
        return catalogRepository.findCities();
    }

    public List<HotelOption> hotels(String cityCode) {
        return catalogRepository.findHotelsByCity(ValidationUtils.requireTrimmed(cityCode, "City"));
    }

    public List<RoomResponse> browseRooms(String checkInDate, String checkOutDate) {
        if ((checkInDate == null || checkInDate.isBlank()) && (checkOutDate == null || checkOutDate.isBlank())) {
            return roomRepository.findAllRooms();
        }
        if (checkInDate == null || checkInDate.isBlank() || checkOutDate == null || checkOutDate.isBlank()) {
            throw new ApiException("Both check-in date and check-out date are required.");
        }
        LocalDate checkIn = LocalDate.parse(checkInDate.trim());
        LocalDate checkOut = LocalDate.parse(checkOutDate.trim());
        ValidationUtils.validateDateRange(checkIn, checkOut);
        return roomRepository.findRoomsForDateRange(checkIn, checkOut);
    }

    public List<RoomResponse> searchRooms(RoomSearchRequest request) {
        String cityCode = ValidationUtils.requireTrimmed(request.cityCode(), "City");
        String hotelCode = ValidationUtils.requireTrimmed(request.hotelCode(), "Hotel");
        LocalDate checkIn = LocalDate.parse(ValidationUtils.requireTrimmed(request.checkInDate(), "Check-in date"));
        LocalDate checkOut = LocalDate.parse(ValidationUtils.requireTrimmed(request.checkOutDate(), "Check-out date"));
        ValidationUtils.validateDateRange(checkIn, checkOut);
        return roomRepository.searchAvailableRooms(
            checkIn,
            checkOut,
            ValidationUtils.requirePositiveGuests(request.adults()),
            request.children() == null ? 0 : Math.max(request.children(), 0),
            cityCode,
            hotelCode,
            ValidationUtils.requireTrimmed(request.roomType(), "Room type")
        );
    }

    public ApiResponse createBooking(BookingCreateRequest request) {
        Long customerId = userRepository.findIdByUserCode(request.customerCode())
            .orElseThrow(() -> new ApiException("Customer not found."));
        RoomRecord room = roomRepository.findRoomByNumber(ValidationUtils.requireTrimmed(request.roomNumber(), "Room number"));
        LocalDate checkIn = LocalDate.parse(request.checkInDate());
        LocalDate checkOut = LocalDate.parse(request.checkOutDate());
        ValidationUtils.validateDateRange(checkIn, checkOut);

        int adults = ValidationUtils.requirePositiveGuests(request.adults());
        int children = request.children() == null ? 0 : request.children();
        if (adults > room.maxAdults() || children > room.maxChildren()) {
            throw new ApiException("Guest count exceeds room occupancy.");
        }
        if (!room.bookable() || !"AVAILABLE".equals(room.roomStatus())) {
            throw new ApiException("Selected room is not available.");
        }
        if (bookingRepository.duplicateCustomerBooking(customerId, room.roomId(), checkIn, checkOut)) {
            throw new ApiException("Duplicate booking detected for the same room and date.");
        }
        if (bookingRepository.hasOverlap(room.roomId(), checkIn, checkOut, null)) {
            throw new ApiException("Selected room is no longer available for the chosen dates.");
        }

        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        BigDecimal totalAmount = room.pricePerNight().multiply(BigDecimal.valueOf(nights)).multiply(BigDecimal.valueOf(1.18));
        ValidationUtils.requirePositiveAmount(totalAmount, "Booking amount");
        String bookingCode = bookingRepository.nextBookingCode();
        bookingRepository.createBooking(
            bookingCode,
            customerId,
            room.roomId(),
            checkIn,
            checkOut,
            adults,
            children,
            ValidationUtils.requireTrimmed(request.paymentMethod(), "Payment method"),
            request.specialRequests() == null ? "" : request.specialRequests().trim(),
            totalAmount
        );
        return new ApiResponse("Booking created successfully with booking code " + bookingCode + ".");
    }

    public List<BookingResponse> getBookings(String customerCode) {
        return bookingRepository.findByCustomerCode(customerCode);
    }

    public ApiResponse updateBooking(String bookingCode, BookingUpdateRequest request) {
        BookingDetails current = bookingRepository.findBookingDetails(bookingCode);
        LocalDate checkIn = LocalDate.parse(request.checkInDate());
        LocalDate checkOut = LocalDate.parse(request.checkOutDate());
        ValidationUtils.validateDateRange(checkIn, checkOut);
        RoomRecord room = roomRepository.findRoomByNumber(ValidationUtils.requireTrimmed(request.roomNumber(), "Room number"));

        int adults = ValidationUtils.requirePositiveGuests(request.adults());
        int children = request.children() == null ? 0 : request.children();
        if (adults > room.maxAdults() || children > room.maxChildren()) {
            throw new ApiException("Guest count exceeds room occupancy.");
        }
        if (bookingRepository.hasOverlap(room.roomId(), checkIn, checkOut, bookingCode)) {
            throw new ApiException("Selected room type is fully booked for these dates.");
        }
        bookingRepository.updateBooking(bookingCode, checkIn, checkOut, adults, children, room.roomId());
        return new ApiResponse("Your booking has been successfully modified.");
    }

    public ApiResponse cancelBooking(String bookingCode) {
        BookingDetails booking = bookingRepository.findBookingDetails(bookingCode);
        long hoursBeforeCheckIn = ChronoUnit.HOURS.between(java.time.LocalDateTime.now(), booking.checkInDate().atStartOfDay());
        BigDecimal refundAmount = BigDecimal.ZERO;
        if (hoursBeforeCheckIn >= 48) {
            refundAmount = booking.totalAmount();
        } else if (hoursBeforeCheckIn >= 24) {
            refundAmount = booking.totalAmount().multiply(BigDecimal.valueOf(0.5));
        }
        bookingRepository.cancelBooking(bookingCode, refundAmount);
        String message = refundAmount.compareTo(BigDecimal.ZERO) > 0
            ? "Your booking has been canceled. A refund of Rs " + refundAmount + " will be processed within 3-5 business days."
            : "As per the hotel policy, this booking is non-refundable.";
        return new ApiResponse(message);
    }

    public ApiResponse createComplaint(ComplaintCreateRequest request) {
        Long customerId = userRepository.findIdByUserCode(request.customerCode())
            .orElseThrow(() -> new ApiException("Customer not found."));
        Long bookingId = request.bookingCode() == null || request.bookingCode().isBlank()
            ? null
            : bookingRepository.findBookingDetails(request.bookingCode()).bookingId();

        String title = ValidationUtils.requireTrimmed(request.complaintTitle(), "Complaint title");
        String description = ValidationUtils.requireTrimmed(request.complaintDescription(), "Complaint description");
        if (title.length() < 10 || title.length() > 100) {
            throw new ApiException("Complaint title must be between 10 and 100 characters.");
        }
        if (description.length() < 20 || description.length() > 500) {
            throw new ApiException("Complaint description must be between 20 and 500 characters.");
        }

        String complaintCode = complaintRepository.nextComplaintCode();
        complaintRepository.createComplaint(
            complaintCode,
            customerId,
            bookingId,
            normalizeComplaintCategory(request.category()),
            title,
            description,
            ValidationUtils.requireTrimmed(request.contactPreference(), "Contact preference").toUpperCase(),
            LocalDate.now().plusDays(3)
        );
        return new ApiResponse("Your complaint has been successfully submitted. Complaint ID: " + complaintCode + ".");
    }

    public List<ComplaintResponse> getComplaints(String customerCode) {
        return complaintRepository.findByCustomerCode(customerCode);
    }

    public ApiResponse updateComplaintStatus(String complaintCode, ComplaintUpdateRequest request) {
        complaintRepository.updateComplaint(
            complaintCode,
            ValidationUtils.requireTrimmed(request.complaintStatus(), "Complaint status").toUpperCase(),
            request.assignedToUserCode() == null || request.assignedToUserCode().isBlank()
                ? null
                : userRepository.findIdByUserCode(request.assignedToUserCode()).orElse(null),
            request.responseText(),
            request.resolutionNotes()
        );
        return new ApiResponse("Complaint updated successfully.");
    }

    private String normalizeComplaintCategory(String category) {
        return ValidationUtils.requireTrimmed(category, "Complaint category")
            .toUpperCase()
            .replace(' ', '_');
    }
}
