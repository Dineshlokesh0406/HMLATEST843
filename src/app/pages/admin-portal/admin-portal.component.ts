import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MockHotelService } from '../../core/mock-hotel.service';
import { AppUser, Booking, CityOption, Complaint, HotelOption, Room } from '../../core/models';
import {
  afterDateValidator,
  countryPhoneValidator,
  emailFormatValidator,
  futureOrTodayValidator,
  lettersAndSpacesValidator,
  trimmedRequiredValidator,
  wholeNumberRangeValidator
} from '../../core/validators';

@Component({
  selector: 'app-admin-portal',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-portal.component.html',
  styleUrl: './admin-portal.component.css'
})
export class AdminPortalComponent {
  private readonly fb = inject(FormBuilder);
  readonly hotel = inject(MockHotelService);
  private readonly router = inject(Router);

  activeSection: 'dashboard' | 'rooms' | 'reservations' | 'users' | 'bills' | 'complaints' | 'profile' = 'dashboard';
  roomMessage = '';
  reservationMessage = '';
  billMessage = '';
  roomSearch = '';
  reservationSearch = '';
  reservationDateFilter = '';
  reservationStatusFilter = '';
  reservationPaymentFilter = '';
  userSearch = '';
  billSearch = '';
  selectedRoomId: string | null = null;
  selectedComplaintAssignee: Record<string, string> = {};
  profileMessage = '';
  profileEditMode = false;
  readonly currentUser = this.hotel.currentUser;
  confirmDialog: { title: string; message: string; confirmText: string; action: () => void | Promise<void> } | null = null;
  readonly pageSizes = [5, 10, 20];
  roomPage = 1;
  roomPageSize = 5;
  reservationPage = 1;
  reservationPageSize = 5;
  userPage = 1;
  userPageSize = 5;
  billPage = 1;
  billPageSize = 5;
  complaintPage = 1;
  complaintPageSize = 5;
  cities: CityOption[] = [];
  roomHotels: HotelOption[] = [];
  reservationHotels: HotelOption[] = [];

  readonly roomForm = this.fb.nonNullable.group({
    cityCode: ['', Validators.required],
    hotelCode: ['', Validators.required],
    roomNumber: [''],
    roomType: ['Deluxe', Validators.required],
    bedType: ['Queen', Validators.required],
    price: [4500, [Validators.required, Validators.min(1)]],
    amenities: ['WiFi, TV'],
    available: [true, Validators.required],
    maxAdults: [2, [Validators.required, wholeNumberRangeValidator(1, 10)]],
    maxChildren: [1, [Validators.required, wholeNumberRangeValidator(0, 5)]],
    status: ['Available', Validators.required],
    description: ['', Validators.maxLength(500)]
  });

  readonly reservationForm = this.fb.nonNullable.group({
    customerId: ['CUS1001', Validators.required],
    customerName: ['Aarav Sharma', [Validators.required, trimmedRequiredValidator(), Validators.minLength(2), Validators.maxLength(50), lettersAndSpacesValidator()]],
    contactEmail: ['aarav@example.com', [Validators.required, emailFormatValidator()]],
    contactPhone: ['+91 9876543210', Validators.required],
    cityCode: ['', Validators.required],
    hotelCode: ['', Validators.required],
    checkIn: ['', [Validators.required, futureOrTodayValidator()]],
    checkOut: ['', [Validators.required, afterDateValidator('checkIn')]],
    guests: [2, [Validators.required, wholeNumberRangeValidator(1, 10)]],
    roomType: ['Deluxe', Validators.required],
    paymentMethod: ['Cash', Validators.required],
    depositAmount: [0, [Validators.required, Validators.min(0)]],
    specialRequests: ['']
  });

  readonly billForm = this.fb.nonNullable.group({
    customerId: ['CUS1001', Validators.required],
    customerName: ['Aarav Sharma', Validators.required],
    roomCharges: [0, [Validators.required, Validators.min(0)]],
    serviceCharges: [0, [Validators.required, Validators.min(0)]],
    tax: [0, [Validators.required, Validators.min(0)]],
    discount: [0, [Validators.required, Validators.min(0)]],
    paymentStatus: ['Pending', Validators.required]
  });

  readonly profileForm = this.fb.nonNullable.group({
    userId: [{ value: '', disabled: true }],
    name: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(2), Validators.maxLength(50), lettersAndSpacesValidator()]],
    email: ['', [Validators.required, emailFormatValidator()]],
    countryCode: ['+91', Validators.required],
    mobile: ['', [Validators.required, countryPhoneValidator('countryCode')]],
    address: ['', [Validators.required, Validators.maxLength(120)]]
  });

  constructor() {
    if (!this.hotel.ensureRoleSession('admin')) {
      this.router.navigate(['/login']);
      return;
    }
    void this.initialize();
    this.reservationForm.controls.checkIn.valueChanges.subscribe(() => {
      this.reservationForm.controls.checkOut.updateValueAndValidity();
    });
    this.profileForm.controls.countryCode.valueChanges.subscribe(() => {
      this.profileForm.controls.mobile.updateValueAndValidity();
    });
  }

  get rooms(): Room[] {
    return this.hotel.rooms().filter((room) =>
      this.roomSearch
        ? room.roomNumber.includes(this.roomSearch) || room.roomType.toLowerCase().includes(this.roomSearch.toLowerCase())
        : true
    );
  }

  get paginatedRooms(): Room[] {
    return this.paginate(this.rooms, this.roomPage, this.roomPageSize);
  }

  get roomTotalPages(): number {
    return this.totalPages(this.rooms.length, this.roomPageSize);
  }

  get reservations(): Booking[] {
    return this.hotel.bookings().filter((booking) =>
      (this.reservationSearch
        ? booking.bookingId.toLowerCase().includes(this.reservationSearch.toLowerCase()) ||
          booking.customerName.toLowerCase().includes(this.reservationSearch.toLowerCase()) ||
          booking.roomNumber.includes(this.reservationSearch)
        : true) &&
      (this.reservationDateFilter ? this.reservationDateFilter >= booking.checkIn && this.reservationDateFilter <= booking.checkOut : true) &&
      (this.reservationStatusFilter ? booking.status === this.reservationStatusFilter : true) &&
      (this.reservationPaymentFilter ? booking.paymentStatus === this.reservationPaymentFilter : true)
    );
  }

  get paginatedReservations(): Booking[] {
    return this.paginate(this.reservations, this.reservationPage, this.reservationPageSize);
  }

  get reservationTotalPages(): number {
    return this.totalPages(this.reservations.length, this.reservationPageSize);
  }

  get users() {
    return this.hotel.users().filter((user) =>
      this.userSearch
        ? user.username.toLowerCase().includes(this.userSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(this.userSearch.toLowerCase())
        : true
    );
  }

  get paginatedUsers(): AppUser[] {
    return this.paginate(this.users, this.userPage, this.userPageSize);
  }

  get userTotalPages(): number {
    return this.totalPages(this.users.length, this.userPageSize);
  }

  get bills() {
    return this.hotel.bills().filter((bill) =>
      this.billSearch
        ? bill.billId.toLowerCase().includes(this.billSearch.toLowerCase()) ||
          bill.customerName.toLowerCase().includes(this.billSearch.toLowerCase())
        : true
    );
  }

  get paginatedBills() {
    return this.paginate(this.bills, this.billPage, this.billPageSize);
  }

  get billTotalPages(): number {
    return this.totalPages(this.bills.length, this.billPageSize);
  }

  get complaints(): Complaint[] {
    return this.hotel.complaints();
  }

  get paginatedComplaints(): Complaint[] {
    return this.paginate(this.complaints, this.complaintPage, this.complaintPageSize);
  }

  get complaintTotalPages(): number {
    return this.totalPages(this.complaints.length, this.complaintPageSize);
  }

  get staffUsers(): AppUser[] {
    return this.hotel.users().filter((user) => user.role === 'staff' && user.status === 'Active');
  }

  get totalBookings(): number {
    return this.hotel.bookings().length;
  }

  get availableRoomsCount(): number {
    return this.hotel.rooms().filter((room) => room.status === 'Available').length;
  }

  get openComplaintsCount(): number {
    return this.hotel.complaints().filter((complaint) => complaint.status !== 'Closed').length;
  }

  setSection(section: 'dashboard' | 'rooms' | 'reservations' | 'users' | 'bills' | 'complaints' | 'profile'): void {
    this.activeSection = section;
    if (section === 'profile') {
      this.syncProfileForm();
      this.setProfileEditMode(false);
    }
  }

  setPage(target: 'rooms' | 'reservations' | 'users' | 'bills' | 'complaints', page: number): void {
    if (target === 'rooms') this.roomPage = Math.min(Math.max(1, page), this.roomTotalPages);
    if (target === 'reservations') this.reservationPage = Math.min(Math.max(1, page), this.reservationTotalPages);
    if (target === 'users') this.userPage = Math.min(Math.max(1, page), this.userTotalPages);
    if (target === 'bills') this.billPage = Math.min(Math.max(1, page), this.billTotalPages);
    if (target === 'complaints') this.complaintPage = Math.min(Math.max(1, page), this.complaintTotalPages);
  }

  setPageSize(target: 'rooms' | 'reservations' | 'users' | 'bills' | 'complaints', value: string): void {
    const size = Number(value) || 5;
    if (target === 'rooms') { this.roomPageSize = size; this.roomPage = 1; }
    if (target === 'reservations') { this.reservationPageSize = size; this.reservationPage = 1; }
    if (target === 'users') { this.userPageSize = size; this.userPage = 1; }
    if (target === 'bills') { this.billPageSize = size; this.billPage = 1; }
    if (target === 'complaints') { this.complaintPageSize = size; this.complaintPage = 1; }
  }

  async editRoom(room: Room): Promise<void> {
    this.selectedRoomId = room.id;
    this.roomHotels = await this.hotel.getAdminHotels(room.cityCode);
    this.roomForm.reset({
      roomNumber: room.roomNumber,
      cityCode: room.cityCode,
      hotelCode: room.hotelCode,
      roomType: room.roomType,
      bedType: room.bedType,
      price: room.price,
      amenities: room.amenities.join(', '),
      available: room.available,
      maxAdults: room.maxAdults,
      maxChildren: room.maxChildren,
      status: room.status,
      description: room.description
    });
  }

  async saveRoom(): Promise<void> {
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      return;
    }
    const raw = this.roomForm.getRawValue();
    try {
      await this.hotel.saveRoom({
        id: this.selectedRoomId ?? undefined,
        cityCode: raw.cityCode,
        hotelCode: raw.hotelCode,
        roomNumber: raw.roomNumber,
        roomType: raw.roomType,
        bedType: raw.bedType,
        price: raw.price,
        amenities: raw.amenities.split(',').map((item) => item.trim()).filter(Boolean),
        available: raw.available,
        maxAdults: raw.maxAdults,
        maxChildren: raw.maxChildren,
        size: raw.roomType === 'Luxury' ? 460 : 320,
        status: raw.status as 'Available' | 'Occupied' | 'Under Maintenance',
        description: raw.description
      });
      this.roomMessage = this.selectedRoomId
        ? `Room ${raw.roomNumber} details are updated successfully.`
        : 'Room added successfully.';
      this.selectedRoomId = null;
      this.roomForm.reset({
        cityCode: '',
        hotelCode: '',
        roomNumber: '',
        roomType: 'Deluxe',
        bedType: 'Queen',
        price: 4500,
        amenities: 'WiFi, TV',
        available: true,
        maxAdults: 2,
        maxChildren: 1,
        status: 'Available',
        description: ''
      });
    } catch (error) {
      this.roomMessage = error instanceof Error ? error.message : 'Unable to save room.';
    }
  }

  async saveReservation(): Promise<void> {
    if (this.reservationForm.invalid) {
      this.reservationForm.markAllAsTouched();
      return;
    }
    const reservationResult = await this.hotel.createAdminReservation(this.reservationForm.getRawValue());
    this.reservationMessage = reservationResult.success && reservationResult.booking
      ? `You have successfully reserved the room. Reservation ID: ${reservationResult.booking.bookingId}`
      : reservationResult.message;
  }

  async cancelReservation(bookingId: string): Promise<void> {
    this.reservationMessage = (await this.hotel.cancelBooking(bookingId)).message;
  }

  async downloadReservationReceipt(bookingId: string): Promise<void> {
    try {
      await this.hotel.downloadBookingReceipt(bookingId);
    } catch (error) {
      this.reservationMessage = error instanceof Error ? error.message : 'Unable to download receipt.';
    }
  }

  async saveBill(): Promise<void> {
    if (this.billForm.invalid) {
      this.billForm.markAllAsTouched();
      return;
    }
    const raw = this.billForm.getRawValue();
    await this.hotel.createBill({
      ...raw,
      paymentStatus: raw.paymentStatus as 'Paid' | 'Pending' | 'Partially Paid'
    });
    this.billMessage = 'Bill saved successfully.';
  }

  async toggleUserStatus(userId: string, currentStatus: string): Promise<void> {
    this.openConfirm('Update user status?', 'This will change the account availability for this user.', 'Update', async () => {
      await this.hotel.updateUserStatus(userId, currentStatus === 'Active' ? 'Inactive' : 'Active');
    });
  }

  async updateComplaint(complaintId: string, status: string): Promise<void> {
    this.openConfirm('Update complaint?', 'This will save the selected complaint assignment and status.', 'Save', async () => {
      const complaint = this.complaints.find((item) => item.complaintId === complaintId);
      await this.hotel.updateComplaint(complaintId, {
        status: status as Complaint['status'],
        assignedTo: this.selectedComplaintAssignee[complaintId] || complaint?.assignedTo || ''
      });
    });
  }

  logout(): void {
    this.openConfirm('Logout now?', 'You will be signed out of the admin portal.', 'Logout', () => {
      this.hotel.logout();
      this.router.navigate(['/login']);
    });
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const raw = this.profileForm.getRawValue();
    this.openConfirm('Save profile changes?', 'Your admin profile details will be updated.', 'Save', async () => {
      try {
        const response = await this.hotel.updateProfile({
          name: raw.name.trim(),
          email: raw.email.trim().toLowerCase(),
          countryCode: raw.countryCode,
          mobile: raw.mobile.trim(),
          address: raw.address.trim()
        });
        this.profileMessage = response.message;
        this.setProfileEditMode(false);
        this.syncProfileForm();
      } catch (error) {
        this.profileMessage = error instanceof Error ? error.message : 'Unable to update profile.';
      }
    });
  }

  setProfileEditMode(editing: boolean): void {
    this.profileEditMode = editing;
    for (const control of Object.values(this.profileForm.controls)) {
      if (editing && control !== this.profileForm.controls.userId) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  }

  cancelProfileEdit(): void {
    this.syncProfileForm();
    this.profileMessage = '';
    this.setProfileEditMode(false);
  }

  openConfirm(title: string, message: string, confirmText: string, action: () => void | Promise<void>): void {
    this.confirmDialog = { title, message, confirmText, action };
  }

  closeConfirm(): void {
    this.confirmDialog = null;
  }

  async confirmAction(): Promise<void> {
    const action = this.confirmDialog?.action;
    this.confirmDialog = null;
    if (action) {
      await action();
    }
  }

  pageSummary(page: number, pageSize: number, total: number): string {
    if (!total) {
      return 'No items';
    }
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(start + pageSize - 1, total);
    return `${start}-${end} of ${total}`;
  }

  async onRoomCityChange(): Promise<void> {
    const cityCode = this.roomForm.controls.cityCode.value;
    this.roomForm.controls.hotelCode.setValue('');
    this.roomHotels = cityCode ? await this.hotel.getAdminHotels(cityCode) : [];
  }

  async onReservationCityChange(): Promise<void> {
    const cityCode = this.reservationForm.controls.cityCode.value;
    this.reservationForm.controls.hotelCode.setValue('');
    this.reservationHotels = cityCode ? await this.hotel.getAdminHotels(cityCode) : [];
  }

  private async initialize(): Promise<void> {
    try {
      this.cities = await this.hotel.getAdminCities();
      await this.hotel.loadAdminData();
      this.syncProfileForm();
      this.setProfileEditMode(false);
    } catch {
      this.router.navigate(['/login']);
    }
  }

  private syncProfileForm(): void {
    const user = this.currentUser();
    if (!user) return;
    this.profileForm.reset({
      userId: user.userId,
      name: user.name,
      email: user.email,
      countryCode: user.countryCode || '+91',
      mobile: user.mobile,
      address: user.address
    });
  }

  private paginate<T>(items: T[], page: number, pageSize: number): T[] {
    const start = (Math.max(1, page) - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  private totalPages(totalItems: number, pageSize: number): number {
    return Math.max(1, Math.ceil(totalItems / pageSize));
  }
}
