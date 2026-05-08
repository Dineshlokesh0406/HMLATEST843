import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MockHotelService } from '../../core/mock-hotel.service';
import { AppUser, Booking, CityOption, Complaint, HotelOption, Room } from '../../core/models';
import { afterDateValidator, futureOrTodayValidator } from '../../core/validators';

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

  activeSection: 'dashboard' | 'rooms' | 'reservations' | 'users' | 'bills' | 'complaints' = 'dashboard';
  roomMessage = '';
  reservationMessage = '';
  billMessage = '';
  roomSearch = '';
  reservationSearch = '';
  userSearch = '';
  billSearch = '';
  selectedRoomId: string | null = null;
  selectedComplaintAssignee: Record<string, string> = {};
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
    maxAdults: [2, [Validators.required, Validators.min(1), Validators.max(10)]],
    maxChildren: [1, [Validators.required, Validators.min(0), Validators.max(5)]],
    status: ['Available', Validators.required],
    description: ['', Validators.maxLength(500)]
  });

  readonly reservationForm = this.fb.nonNullable.group({
    customerId: ['CUS1001', Validators.required],
    customerName: ['Aarav Sharma', Validators.required],
    contactEmail: ['aarav@example.com', [Validators.required, Validators.email]],
    contactPhone: ['+91 9876543210', Validators.required],
    cityCode: ['', Validators.required],
    hotelCode: ['', Validators.required],
    checkIn: ['', [Validators.required, futureOrTodayValidator()]],
    checkOut: ['', [Validators.required, afterDateValidator('checkIn')]],
    guests: [2, [Validators.required, Validators.min(1), Validators.max(10)]],
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

  constructor() {
    if (!this.hotel.ensureRoleSession('admin')) {
      this.router.navigate(['/login']);
      return;
    }
    void this.initialize();
    this.reservationForm.controls.checkIn.valueChanges.subscribe(() => {
      this.reservationForm.controls.checkOut.updateValueAndValidity();
    });
  }

  get rooms(): Room[] {
    return this.hotel.rooms().filter((room) =>
      this.roomSearch
        ? room.roomNumber.includes(this.roomSearch) || room.roomType.toLowerCase().includes(this.roomSearch.toLowerCase())
        : true
    );
  }

  get reservations(): Booking[] {
    return this.hotel.bookings().filter((booking) =>
      this.reservationSearch
        ? booking.bookingId.toLowerCase().includes(this.reservationSearch.toLowerCase()) ||
          booking.customerName.toLowerCase().includes(this.reservationSearch.toLowerCase()) ||
          booking.roomNumber.includes(this.reservationSearch)
        : true
    );
  }

  get users() {
    return this.hotel.users().filter((user) =>
      this.userSearch
        ? user.username.toLowerCase().includes(this.userSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(this.userSearch.toLowerCase())
        : true
    );
  }

  get bills() {
    return this.hotel.bills().filter((bill) =>
      this.billSearch
        ? bill.billId.toLowerCase().includes(this.billSearch.toLowerCase()) ||
          bill.customerName.toLowerCase().includes(this.billSearch.toLowerCase())
        : true
    );
  }

  get complaints(): Complaint[] {
    return this.hotel.complaints();
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

  setSection(section: 'dashboard' | 'rooms' | 'reservations' | 'users' | 'bills' | 'complaints'): void {
    this.activeSection = section;
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
    await this.hotel.updateUserStatus(userId, currentStatus === 'Active' ? 'Inactive' : 'Active');
  }

  async updateComplaint(complaintId: string, status: string): Promise<void> {
    const complaint = this.complaints.find((item) => item.complaintId === complaintId);
    await this.hotel.updateComplaint(complaintId, {
      status: status as Complaint['status'],
      assignedTo: this.selectedComplaintAssignee[complaintId] || complaint?.assignedTo || ''
    });
  }

  logout(): void {
    this.hotel.logout();
    this.router.navigate(['/login']);
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
    } catch {
      this.router.navigate(['/login']);
    }
  }
}
