import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppUser, Bill, Booking, CityOption, Complaint, HotelOption, Room, RoomSearchCriteria, UserRole } from './models';

type LoginResult = { success: boolean; message: string; role?: UserRole };
type RegisterResult = { success: boolean; message: string; user?: AppUser };
type BookingResult = { success: boolean; message: string; booking?: Booking };

interface AuthResponseDto {
  message: string;
  userCode: string;
  fullName: string;
  email: string;
  role: string;
}

interface UserSummaryDto {
  userCode: string;
  fullName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  address: string;
  username: string;
  role: string;
  accountStatus: string;
}

interface RoomResponseDto {
  cityCode: string;
  cityName: string;
  hotelCode: string;
  hotelName: string;
  roomNumber: string;
  roomType: string;
  bedType: string;
  pricePerNight: number;
  roomStatus: string;
  bookable: boolean;
  maxAdults: number;
  maxChildren: number;
  sizeSqFt: number;
  description: string;
  amenities: string[];
  available: boolean;
}

interface BookingResponseDto {
  bookingCode: string;
  customerCode: string;
  customerName: string;
  cityCode: string;
  cityName: string;
  hotelCode: string;
  hotelName: string;
  roomNumber: string;
  roomType: string;
  bookedDate: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  bookingStatus: string;
  paymentStatus: string;
  totalAmount: number;
  specialRequests: string;
  canceledDate: string | null;
}

interface CityOptionDto {
  cityCode: string;
  cityName: string;
  stateName: string;
}

interface HotelOptionDto {
  hotelCode: string;
  hotelName: string;
  cityCode: string;
  cityName: string;
}

interface ComplaintResponseDto {
  complaintCode: string;
  customerCode: string;
  bookingCode: string;
  category: string;
  complaintTitle: string;
  complaintDescription: string;
  contactPreference: string;
  complaintStatus: string;
  assignedToUserCode: string | null;
  expectedResolutionDate: string | null;
  responseText: string | null;
  resolutionNotes: string | null;
}

interface BillResponseDto {
  billNumber: string;
  customerCode: string;
  bookingCode: string | null;
  roomCharges: number;
  serviceCharges: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
  issueDate: string;
  notes: string | null;
}

interface ApiMessageDto {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class MockHotelService {
  readonly roomTypes = ['Deluxe', 'Luxury'];
  readonly paymentMethods = ['Credit Card', 'Debit Card', 'UPI', 'Wallet'];
  readonly countryCodes = ['+91', '+1', '+44', '+61'];
  readonly amenities = ['WiFi', 'TV', 'AC', 'Mini-bar', 'Breakfast', 'Work Desk'];

  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://localhost:8080/api';
  private readonly sessionKey = 'hm.sessionUser';
  private readonly bookingAmountOverridesKey = 'hm.bookingAmountOverrides';

  private readonly currentUserSignal = signal<AppUser | null>(this.readSession());
  private readonly usersSignal = signal<AppUser[]>([]);
  private readonly roomsSignal = signal<Room[]>([]);
  private readonly bookingsSignal = signal<Booking[]>([]);
  private readonly complaintsSignal = signal<Complaint[]>([]);
  private readonly billsSignal = signal<Bill[]>([]);
  private readonly bookingAmountOverridesSignal = signal<Record<string, number>>(this.readBookingAmountOverrides());

  readonly users = computed(() => this.usersSignal());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly rooms = computed(() => this.roomsSignal());
  readonly bookings = computed(() => this.bookingsSignal());
  readonly complaints = computed(() => this.complaintsSignal());
  readonly bills = computed(() => this.billsSignal());

  isLoggedIn(): boolean {
    return !!this.currentUserSignal();
  }

  hasRole(role: UserRole): boolean {
    return this.currentUserSignal()?.role === role;
  }

  ensureRoleSession(role: UserRole): boolean {
    const current = this.currentUserSignal();
    return !!current && current.role === role;
  }

  async login(role: UserRole, identifier: string, password: string): Promise<LoginResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponseDto>(`${this.apiBase}/auth/login`, {
          role: role.toUpperCase(),
          usernameOrEmail: identifier.trim(),
          password: password.trim()
        })
      );
      const user = this.mapAuthUser(response);
      this.setCurrentUser(user);
      if (user.role === 'customer') {
        await this.refreshCustomerContext(user.userId);
      } else if (user.role === 'admin') {
        await this.loadAdminData();
      } else {
        await this.loadStaffData();
      }
      return { success: true, message: response.message, role: user.role };
    } catch (error) {
      return { success: false, message: this.extractError(error) };
    }
  }

  async getCustomerCities(): Promise<CityOption[]> {
    const cities = await firstValueFrom(this.http.get<CityOptionDto[]>(`${this.apiBase}/customer/cities`));
    return cities.map((city) => ({
      cityCode: city.cityCode,
      cityName: city.cityName,
      stateName: city.stateName
    }));
  }

  async getCustomerHotels(cityCode: string): Promise<HotelOption[]> {
    const hotels = await firstValueFrom(this.http.get<HotelOptionDto[]>(`${this.apiBase}/customer/hotels/${cityCode}`));
    return hotels.map((hotel) => ({
      hotelCode: hotel.hotelCode,
      hotelName: hotel.hotelName,
      cityCode: hotel.cityCode,
      cityName: hotel.cityName
    }));
  }

  async getAdminCities(): Promise<CityOption[]> {
    const cities = await firstValueFrom(this.http.get<CityOptionDto[]>(`${this.apiBase}/admin/cities`));
    return cities.map((city) => ({
      cityCode: city.cityCode,
      cityName: city.cityName,
      stateName: city.stateName
    }));
  }

  async getAdminHotels(cityCode: string): Promise<HotelOption[]> {
    const hotels = await firstValueFrom(this.http.get<HotelOptionDto[]>(`${this.apiBase}/admin/hotels/${cityCode}`));
    return hotels.map((hotel) => ({
      hotelCode: hotel.hotelCode,
      hotelName: hotel.hotelName,
      cityCode: hotel.cityCode,
      cityName: hotel.cityName
    }));
  }

  async getPublicRooms(criteria?: { checkIn?: string; checkOut?: string }): Promise<Room[]> {
    const hasDateRange = !!criteria?.checkIn && !!criteria?.checkOut;
    const endpoint = hasDateRange
      ? `${this.apiBase}/customer/rooms/availability?checkInDate=${encodeURIComponent(criteria!.checkIn!)}&checkOutDate=${encodeURIComponent(criteria!.checkOut!)}`
      : `${this.apiBase}/admin/rooms`;
    const rooms = await firstValueFrom(this.http.get<RoomResponseDto[]>(endpoint));
    return rooms.map((room) => this.mapRoom(room));
  }

  logout(): void {
    this.setCurrentUser(null);
    this.usersSignal.set([]);
    this.roomsSignal.set([]);
    this.bookingsSignal.set([]);
    this.complaintsSignal.set([]);
    this.billsSignal.set([]);
  }

  async registerCustomer(payload: Omit<AppUser, 'userId' | 'role' | 'status' | 'failedAttempts' | 'firstLogin'>): Promise<RegisterResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponseDto>(`${this.apiBase}/auth/register`, {
          fullName: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
          countryCode: payload.countryCode.trim(),
          phoneNumber: payload.mobile.trim(),
          address: payload.address.trim(),
          username: payload.username.trim(),
          password: payload.password.trim(),
          confirmPassword: payload.password.trim()
        })
      );
      const user = this.mapAuthUser(response);
      this.setCurrentUser(user);
      await this.fetchCustomerProfile(user.userId);
      return { success: true, message: response.message, user: this.currentUserSignal() ?? user };
    } catch (error) {
      return { success: false, message: this.extractError(error) };
    }
  }

  saveBookingPaidAmounts(bookingIds: string[], totalPaid: number): void {
    if (!bookingIds.length) {
      return;
    }
    const sanitizedTotal = Math.max(0, Math.round(Number(totalPaid) || 0));
    const baseShare = Math.floor(sanitizedTotal / bookingIds.length);
    let remaining = sanitizedTotal;
    const nextOverrides = { ...this.bookingAmountOverridesSignal() };

    bookingIds.forEach((bookingId, index) => {
      const amount = index === bookingIds.length - 1 ? remaining : baseShare;
      nextOverrides[bookingId] = amount;
      remaining -= amount;
    });

    this.bookingAmountOverridesSignal.set(nextOverrides);
    localStorage.setItem(this.bookingAmountOverridesKey, JSON.stringify(nextOverrides));
    this.bookingsSignal.update((bookings) =>
      bookings.map((booking) => nextOverrides[booking.bookingId] !== undefined
        ? { ...booking, amount: nextOverrides[booking.bookingId] }
        : booking)
    );
  }

  async updateProfile(patch: Partial<AppUser>): Promise<ApiMessageDto> {
    const current = this.requireCurrentUser();
    const response = await firstValueFrom(
      this.http.put<ApiMessageDto>(`${this.apiBase}/customer/profile/${current.userId}`, {
        fullName: patch.name?.trim() ?? current.name,
        email: patch.email?.trim().toLowerCase() ?? current.email,
        countryCode: patch.countryCode ?? current.countryCode,
        phoneNumber: patch.mobile?.trim() ?? current.mobile,
        address: patch.address?.trim() ?? current.address
      })
    );
    await this.fetchCustomerProfile(current.userId);
    return response;
  }

  async searchRooms(criteria: RoomSearchCriteria): Promise<Room[]> {
    const rooms = await firstValueFrom(
      this.http.post<RoomResponseDto[]>(`${this.apiBase}/customer/rooms/search`, {
        cityCode: criteria.cityCode,
        hotelCode: criteria.hotelCode,
        checkInDate: criteria.checkIn,
        checkOutDate: criteria.checkOut,
        adults: criteria.adults,
        children: criteria.children,
        roomType: criteria.roomType
      })
    );
    return rooms.map((room) => this.mapRoom(room));
  }

  async createBooking(payload: {
    room: Room;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    paymentMethod: string;
    specialRequests: string;
  }): Promise<BookingResult> {
    const current = this.requireCurrentUser();
    try {
      const response = await firstValueFrom(
        this.http.post<ApiMessageDto>(`${this.apiBase}/customer/bookings`, {
          customerCode: current.userId,
          roomNumber: payload.room.roomNumber,
          checkInDate: payload.checkIn,
          checkOutDate: payload.checkOut,
          adults: payload.adults,
          children: payload.children,
          paymentMethod: payload.paymentMethod,
          specialRequests: payload.specialRequests
        })
      );
      await this.refreshCustomerContext(current.userId);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, message: this.extractError(error) };
    }
  }

  async updateBooking(bookingId: string, patch: Partial<Booking>): Promise<ApiMessageDto> {
    const response = await firstValueFrom(
      this.http.put<ApiMessageDto>(`${this.apiBase}/customer/bookings/${bookingId}`, {
        checkInDate: patch.checkIn,
        checkOutDate: patch.checkOut,
        adults: patch.adults,
        children: patch.children,
        roomNumber: patch.roomNumber
      })
    );
    const current = this.requireCurrentUser();
    await this.loadBookings(current.userId);
    return response;
  }

  async cancelBooking(bookingId: string): Promise<{ message: string; refundAmount: number }> {
    const response = await firstValueFrom(
      this.http.post<ApiMessageDto>(`${this.apiBase}/customer/bookings/${bookingId}/cancel`, {})
    );
    const current = this.requireCurrentUser();
    if (current.role === 'customer') {
      await this.loadBookings(current.userId);
    } else {
      await this.loadReservations();
    }
    return { message: response.message, refundAmount: 0 };
  }

  async createComplaint(payload: Omit<Complaint, 'complaintId' | 'status' | 'submittedOn' | 'expectedResolution' | 'priority'>): Promise<Complaint> {
    const response = await firstValueFrom(
      this.http.post<ApiMessageDto>(`${this.apiBase}/customer/complaints`, {
        customerCode: payload.userId,
        bookingCode: payload.bookingId && payload.bookingId !== 'N/A' ? payload.bookingId : '',
        category: payload.category,
        complaintTitle: payload.title,
        complaintDescription: payload.description,
        contactPreference: payload.contactPreference.toUpperCase()
      })
    );
    const current = this.requireCurrentUser();
    await this.loadComplaints(current.userId);
    const createdId = response.message.match(/Complaint ID:\s*([A-Z0-9]+)/i)?.[1];
    return this.complaintsSignal().find((complaint) => complaint.complaintId === createdId) ?? this.complaintsSignal()[0];
  }

  async updateComplaint(complaintId: string, patch: Partial<Complaint>): Promise<void> {
    const current = this.requireCurrentUser();
    const isCustomer = current.role === 'customer';
    const base = isCustomer ? `${this.apiBase}/customer/complaints/${complaintId}` : current.role === 'admin'
      ? `${this.apiBase}/admin/complaints/${complaintId}`
      : `${this.apiBase}/staff/complaints/${complaintId}`;

    await firstValueFrom(
      this.http.patch<ApiMessageDto>(base, {
        complaintStatus: patch.status?.toUpperCase().replace(/ /g, '_'),
        assignedToUserCode: patch.assignedTo ?? '',
        responseText: patch.response ?? '',
        resolutionNotes: patch.resolutionNotes ?? ''
      })
    );

    if (current.role === 'customer') {
      await this.loadComplaints(current.userId);
    } else if (current.role === 'admin') {
      await this.loadAdminComplaints();
    } else {
      await this.loadStaffData();
    }
  }

  async saveRoom(payload: {
    id?: string;
    cityCode: string;
    hotelCode: string;
    roomNumber: string;
    roomType: string;
    bedType: string;
    price: number;
    amenities: string[];
    available: boolean;
    maxAdults: number;
    maxChildren: number;
    size: number;
    status: Room['status'];
    description: string;
  }): Promise<void> {
    await firstValueFrom(
      this.http.post<ApiMessageDto>(`${this.apiBase}/admin/rooms`, {
        hotelCode: payload.hotelCode,
        roomNumber: payload.roomNumber,
        roomType: payload.roomType,
        bedType: payload.bedType,
        pricePerNight: payload.price,
        roomStatus: payload.status.toUpperCase().replace(/ /g, '_'),
        bookable: payload.available,
        maxAdults: payload.maxAdults,
        maxChildren: payload.maxChildren,
        sizeSqFt: payload.size,
        description: payload.description
      })
    );
    await this.loadRooms();
  }

  async createAdminReservation(payload: {
    customerId: string;
    customerName: string;
    contactEmail: string;
    contactPhone: string;
    cityCode: string;
    hotelCode: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    paymentMethod: string;
    depositAmount: number;
    specialRequests: string;
  }): Promise<BookingResult> {
    try {
      const rooms = await this.searchRooms({
        cityCode: payload.cityCode,
        hotelCode: payload.hotelCode,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        adults: payload.guests,
        children: 0,
        roomType: payload.roomType
      });
      const room = rooms.find((item) => item.available);
      if (!room) {
        return { success: false, message: 'No room is currently available for the selected room type and date range.' };
      }
      const response = await firstValueFrom(
        this.http.post<ApiMessageDto>(`${this.apiBase}/admin/reservations`, {
          customerCode: payload.customerId,
          roomNumber: room.roomNumber,
          checkInDate: payload.checkIn,
          checkOutDate: payload.checkOut,
          adults: payload.guests,
          children: 0,
          paymentMethod: payload.paymentMethod,
          specialRequests: payload.specialRequests
        })
      );
      await this.loadReservations();
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, message: this.extractError(error) };
    }
  }

  async createBill(payload: Omit<Bill, 'billId' | 'issuedOn' | 'totalAmount'>): Promise<void> {
    await firstValueFrom(
      this.http.post<ApiMessageDto>(`${this.apiBase}/admin/bills`, {
        customerCode: payload.customerId,
        bookingCode: '',
        roomCharges: payload.roomCharges,
        serviceCharges: payload.serviceCharges,
        taxAmount: payload.tax,
        discountAmount: payload.discount,
        paymentStatus: payload.paymentStatus.toUpperCase().replace(/ /g, '_'),
        notes: ''
      })
    );
    await this.loadBills();
  }

  async updateUserStatus(userId: string, status: 'Active' | 'Inactive'): Promise<void> {
    await firstValueFrom(
      this.http.patch<ApiMessageDto>(`${this.apiBase}/admin/users/${userId}/status`, {
        accountStatus: status.toUpperCase()
      })
    );
    await this.loadUsers();
  }

  async loadCustomerData(): Promise<void> {
    const current = this.requireCurrentUser();
    await this.refreshCustomerContext(current.userId);
  }

  async loadAdminData(): Promise<void> {
    await Promise.all([
      this.loadRooms(),
      this.loadReservations(),
      this.loadUsers(),
      this.loadBills(),
      this.loadAdminComplaints()
    ]);
  }

  async loadStaffData(): Promise<void> {
    await this.loadAdminComplaints();
  }

  private async refreshCustomerContext(userCode: string): Promise<void> {
    await Promise.all([
      this.fetchCustomerProfile(userCode),
      this.loadBookings(userCode),
      this.loadComplaints(userCode)
    ]);
  }

  private async fetchCustomerProfile(userCode: string): Promise<void> {
    const dto = await firstValueFrom(this.http.get<UserSummaryDto>(`${this.apiBase}/customer/profile/${userCode}`));
    const current = this.currentUserSignal();
    this.setCurrentUser({
      userId: dto.userCode,
      name: dto.fullName,
      email: dto.email,
      countryCode: dto.countryCode,
      mobile: dto.phoneNumber,
      address: dto.address,
      username: dto.username,
      password: current?.password ?? '',
      role: this.mapRole(dto.role),
      status: this.mapAccountStatus(dto.accountStatus),
      failedAttempts: current?.failedAttempts ?? 0,
      firstLogin: current?.firstLogin ?? false
    });
  }

  private async loadRooms(): Promise<void> {
    const dtos = await firstValueFrom(this.http.get<RoomResponseDto[]>(`${this.apiBase}/admin/rooms`));
    this.roomsSignal.set(dtos.map((room) => this.mapRoom(room)));
  }

  private async loadBookings(customerCode: string): Promise<void> {
    const dtos = await firstValueFrom(this.http.get<BookingResponseDto[]>(`${this.apiBase}/customer/bookings/${customerCode}`));
    const current = this.currentUserSignal();
    const overrides = this.bookingAmountOverridesSignal();
    this.bookingsSignal.set(dtos.map((booking) => {
      const mapped = this.mapBooking(booking, current);
      return overrides[mapped.bookingId] !== undefined
        ? { ...mapped, amount: overrides[mapped.bookingId] }
        : mapped;
    }));
  }

  private async loadReservations(): Promise<void> {
    const dtos = await firstValueFrom(this.http.get<BookingResponseDto[]>(`${this.apiBase}/admin/reservations`));
    this.bookingsSignal.set(dtos.map((booking) => this.mapBooking(booking, null)));
  }

  private async loadComplaints(customerCode: string): Promise<void> {
    const dtos = await firstValueFrom(this.http.get<ComplaintResponseDto[]>(`${this.apiBase}/customer/complaints/${customerCode}`));
    this.complaintsSignal.set(dtos.map((complaint) => this.mapComplaint(complaint)));
  }

  private async loadAdminComplaints(): Promise<void> {
    const dtos = await firstValueFrom(this.http.get<ComplaintResponseDto[]>(`${this.apiBase}/admin/complaints`));
    this.complaintsSignal.set(dtos.map((complaint) => this.mapComplaint(complaint)));
  }

  private async loadUsers(): Promise<void> {
    const dtos = await firstValueFrom(this.http.get<UserSummaryDto[]>(`${this.apiBase}/admin/users`));
    this.usersSignal.set(dtos.map((user) => ({
      userId: user.userCode,
      name: user.fullName,
      email: user.email,
      countryCode: user.countryCode,
      mobile: user.phoneNumber,
      address: user.address,
      username: user.username,
      password: '',
      role: this.mapRole(user.role),
      status: this.mapAccountStatus(user.accountStatus),
      failedAttempts: 0,
      firstLogin: false
    })));
  }

  private async loadBills(): Promise<void> {
    const dtos = await firstValueFrom(this.http.get<BillResponseDto[]>(`${this.apiBase}/admin/bills`));
    this.billsSignal.set(dtos.map((bill) => ({
      billId: bill.billNumber,
      customerId: bill.customerCode,
      customerName: bill.customerCode,
      issuedOn: bill.issueDate,
      totalAmount: bill.totalAmount,
      paymentStatus: this.mapPaymentStatus(bill.paymentStatus),
      roomCharges: bill.roomCharges,
      serviceCharges: bill.serviceCharges,
      tax: bill.taxAmount,
      discount: bill.discountAmount
    })));
  }

  private mapAuthUser(dto: AuthResponseDto): AppUser {
    return {
      userId: dto.userCode,
      name: dto.fullName,
      email: dto.email,
      countryCode: '+91',
      mobile: '',
      address: '',
      username: '',
      password: '',
      role: this.mapRole(dto.role),
      status: 'Active',
      failedAttempts: 0,
      firstLogin: false
    };
  }

  private mapRoom(dto: RoomResponseDto): Room {
    return {
      id: dto.roomNumber,
      cityCode: dto.cityCode,
      cityName: dto.cityName,
      hotelCode: dto.hotelCode,
      hotelName: dto.hotelName,
      roomNumber: dto.roomNumber,
      roomType: dto.roomType,
      bedType: dto.bedType,
      price: Number(dto.pricePerNight),
      amenities: dto.amenities ?? [],
      available: dto.available,
      maxAdults: dto.maxAdults,
      maxChildren: dto.maxChildren,
      size: dto.sizeSqFt,
      status: this.mapRoomStatus(dto.roomStatus),
      description: dto.description
    };
  }

  private mapBooking(dto: BookingResponseDto, current: AppUser | null): Booking {
    return {
      bookingId: dto.bookingCode,
      userId: dto.customerCode,
      customerName: dto.customerName,
      customerEmail: current?.email ?? '',
      customerPhone: current ? `${current.countryCode} ${current.mobile}`.trim() : '',
      cityCode: dto.cityCode,
      cityName: dto.cityName,
      hotelCode: dto.hotelCode,
      hotelName: dto.hotelName,
      roomId: dto.roomNumber,
      roomNumber: dto.roomNumber,
      roomType: dto.roomType,
      bookedOn: dto.bookedDate,
      checkIn: dto.checkInDate,
      checkOut: dto.checkOutDate,
      adults: dto.adults,
      children: dto.children,
      status: this.mapBookingStatus(dto.bookingStatus),
      paymentStatus: this.mapPaymentStatus(dto.paymentStatus),
      paymentMethod: '',
      amount: Number(dto.totalAmount),
      specialRequests: dto.specialRequests,
      bookingDate: dto.bookedDate,
      canceledOn: dto.canceledDate ?? undefined
    };
  }

  private mapComplaint(dto: ComplaintResponseDto): Complaint {
    return {
      complaintId: dto.complaintCode,
      userId: dto.customerCode,
      bookingId: dto.bookingCode ?? 'N/A',
      category: dto.category.replace(/_/g, ' '),
      title: dto.complaintTitle,
      description: dto.complaintDescription,
      contactPreference: dto.contactPreference === 'CALL' ? 'Call' : 'Email',
      status: this.mapComplaintStatus(dto.complaintStatus),
      submittedOn: dto.expectedResolutionDate ?? '',
      expectedResolution: dto.expectedResolutionDate ?? '',
      response: dto.responseText ?? undefined,
      resolutionNotes: dto.resolutionNotes ?? undefined,
      assignedTo: dto.assignedToUserCode ?? undefined,
      priority: 'Medium'
    };
  }

  private mapRole(value: string): UserRole {
    return value.toLowerCase() as UserRole;
  }

  private mapAccountStatus(value: string): AppUser['status'] {
    return value
      .toLowerCase()
      .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase()) as AppUser['status'];
  }

  private mapRoomStatus(value: string): Room['status'] {
    if (value === 'UNDER_MAINTENANCE') {
      return 'Under Maintenance';
    }
    return value.charAt(0) + value.slice(1).toLowerCase() as Room['status'];
  }

  private mapBookingStatus(value: string): Booking['status'] {
    if (value === 'CHECKED_IN') {
      return 'Checked-in';
    }
    if (value === 'CHECKED_OUT') {
      return 'Checked-out';
    }
    return value.charAt(0) + value.slice(1).toLowerCase() as Booking['status'];
  }

  private mapPaymentStatus(value: string): Bill['paymentStatus'] {
    if (value === 'PARTIALLY_PAID') {
      return 'Partially Paid';
    }
    return value.charAt(0) + value.slice(1).toLowerCase() as Bill['paymentStatus'];
  }

  private mapComplaintStatus(value: string): Complaint['status'] {
    if (value === 'IN_PROGRESS') {
      return 'In Progress';
    }
    return value.charAt(0) + value.slice(1).toLowerCase() as Complaint['status'];
  }

  private requireCurrentUser(): AppUser {
    const current = this.currentUserSignal();
    if (!current) {
      throw new Error('User session not available.');
    }
    return current;
  }

  private setCurrentUser(user: AppUser | null): void {
    this.currentUserSignal.set(user);
    if (user) {
      localStorage.setItem(this.sessionKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.sessionKey);
    }
  }

  private readSession(): AppUser | null {
    try {
      const raw = localStorage.getItem(this.sessionKey);
      return raw ? JSON.parse(raw) as AppUser : null;
    } catch {
      return null;
    }
  }

  private extractError(error: unknown): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const errorBody = (error as { error?: { message?: string } }).error;
      if (errorBody?.message) {
        return errorBody.message;
      }
    }
    return 'Something went wrong. Please try again.';
  }

  private readBookingAmountOverrides(): Record<string, number> {
    try {
      const raw = localStorage.getItem(this.bookingAmountOverridesKey);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      );
    } catch {
      return {};
    }
  }
}
