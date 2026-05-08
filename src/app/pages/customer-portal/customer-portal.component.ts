import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import { MockHotelService } from '../../core/mock-hotel.service';
import { Booking, CityOption, Complaint, HotelOption, Room } from '../../core/models';
import {
  afterDateValidator,
  expiryDateValidator,
  futureOrTodayValidator,
  indianPhoneValidator,
  lettersAndSpacesValidator,
  maxStayDurationValidator,
  positiveAmountValidator,
  trimmedRequiredValidator
} from '../../core/validators';

type HomeStep = 'listing' | 'details' | 'confirmation' | 'payment' | 'success';

interface HotelCard {
  hotelCode: string;
  hotelName: string;
  cityCode: string;
  cityName: string;
  description: string;
  startingPrice: number;
  amenities: string[];
  availableRoomCount: number;
  roomTypes: string[];
}

interface RoomCategoryCard {
  roomType: string;
  bedType: string;
  price: number;
  availableRooms: number;
  amenities: string[];
  description: string;
  rooms: Room[];
}

interface BookingSuccessData {
  bookingIds: string[];
  invoiceNumber: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  discount: number;
  total: number;
  roomsBooked: number;
  guestCount: number;
  hotelName: string;
  cityName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  paymentMethod: string;
}

interface ConfirmationDialogState {
  label: string;
  title: string;
  message: string;
  confirmText: string;
}

@Component({
  selector: 'app-customer-portal',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './customer-portal.component.html',
  styleUrl: './customer-portal.component.css'
})
export class CustomerPortalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pageSize = 9;
  private readonly defaultCheckIn = this.formatDateInput(this.addDays(new Date(), 1));
  private readonly defaultCheckOut = this.formatDateInput(this.addDays(new Date(), 2));
  private readonly hotelCardImages: Record<string, string> = {
    GOA: 'assets/single.webp',
    BLR: 'assets/double.jpeg',
    DEFAULT: 'assets/luxe.jpeg'
  };
  readonly hotel = inject(MockHotelService);
  private readonly router = inject(Router);

  readonly currentUser = this.hotel.currentUser;
  readonly allComplaints = computed(() =>
    this.hotel.complaints().filter((complaint) => complaint.userId === this.currentUser()?.userId)
  );
  readonly customerBookings = computed(() =>
    this.hotel.bookings().filter((booking) => booking.userId === this.currentUser()?.userId)
  );
  readonly homeRooms = signal<Room[]>([]);
  readonly selectedHomeCityCode = signal('');
  readonly homeCurrentPage = signal(1);
  readonly homeLoading = signal(true);
  readonly homeLoadMessage = signal('');
  readonly homeStep = signal<HomeStep>('listing');
  readonly selectedHotelCard = signal<HotelCard | null>(null);
  readonly selectedRoomCategory = signal<RoomCategoryCard | null>(null);
  readonly showAdditionalRoomsPopup = signal(false);
  readonly confirmationDialog = signal<ConfirmationDialogState | null>(null);
  readonly processingPayment = signal(false);
  readonly successData = signal<BookingSuccessData | null>(null);

  activeSection: 'home' | 'bookings' | 'complaints' | 'contact' | 'profile' = 'home';
  searchResults: Room[] = [];
  searchPerformed = false;
  selectedRoom: Room | null = null;
  bookingMessage = '';
  complaintMessage = '';
  profileMessage = '';
  editingBookingId: string | null = null;
  editingBooking: Booking | null = null;
  selectedComplaint: Complaint | null = null;
  sortMode: 'low' | 'high' | 'availability' = 'low';
  priceFilter = 'all';
  amenityFilter = '';
  sizeFilter = 'all';
  private lastCapacityPromptGuestCount = 0;
  private proceedToPaymentAfterCapacityPopup = false;
  private pendingConfirmationAction: (() => void | Promise<void>) | null = null;
  cities: CityOption[] = [];
  hotels: HotelOption[] = [];

  readonly filteredHomeRooms = computed(() => {
    const cityCode = this.selectedHomeCityCode();
    const matches = this.homeRooms().filter((room) => !cityCode || room.cityCode === cityCode);
    return [...matches].sort((left, right) => {
      if (left.available !== right.available) {
        return Number(right.available) - Number(left.available);
      }
      if (left.cityName !== right.cityName) {
        return left.cityName.localeCompare(right.cityName);
      }
      return left.price - right.price;
    });
  });

  readonly hotelCards = computed<HotelCard[]>(() => {
    const groups = new Map<string, Room[]>();
    for (const room of this.filteredHomeRooms()) {
      const current = groups.get(room.hotelCode) ?? [];
      current.push(room);
      groups.set(room.hotelCode, current);
    }

    return [...groups.values()].map((rooms) => {
      const first = rooms[0];
      const amenities = [...new Set(rooms.flatMap((room) => room.amenities))].slice(0, 6);
      const roomTypes = [...new Set(rooms.map((room) => room.roomType))];
      return {
        hotelCode: first.hotelCode,
        hotelName: first.hotelName,
        cityCode: first.cityCode,
        cityName: first.cityName,
        description: first.description,
        startingPrice: Math.min(...rooms.map((room) => room.price)),
        amenities,
        availableRoomCount: rooms.filter((room) => room.available).length,
        roomTypes
      };
    }).sort((left, right) => {
      if (left.cityName !== right.cityName) {
        return left.cityName.localeCompare(right.cityName);
      }
      return left.startingPrice - right.startingPrice;
    });
  });

  readonly totalHomePages = computed(() => Math.max(1, Math.ceil(this.hotelCards().length / this.pageSize)));

  readonly paginatedHomeRooms = computed(() => {
    const page = Math.min(this.homeCurrentPage(), this.totalHomePages());
    const start = (page - 1) * this.pageSize;
    return this.hotelCards().slice(start, start + this.pageSize);
  });

  readonly homePageStart = computed(() => {
    if (!this.hotelCards().length) {
      return 0;
    }
    return (Math.min(this.homeCurrentPage(), this.totalHomePages()) - 1) * this.pageSize + 1;
  });

  readonly homePageEnd = computed(() => Math.min(this.homePageStart() + this.pageSize - 1, this.hotelCards().length));

  readonly selectedHotelRoomCategories = computed<RoomCategoryCard[]>(() => {
    const hotel = this.selectedHotelCard();
    if (!hotel) {
      return [];
    }
    const rooms = this.homeRooms().filter((room) => room.hotelCode === hotel.hotelCode);
    const groups = new Map<string, Room[]>();
    for (const room of rooms) {
      const key = `${room.roomType}-${room.bedType}`;
      const current = groups.get(key) ?? [];
      current.push(room);
      groups.set(key, current);
    }

    return [...groups.values()].map((group) => {
      const first = group[0];
      return {
        roomType: first.roomType,
        bedType: first.bedType,
        price: Math.min(...group.map((room) => room.price)),
        availableRooms: group.filter((room) => room.available).length,
        amenities: [...new Set(group.flatMap((room) => room.amenities))],
        description: first.description,
        rooms: group
      };
    }).sort((left, right) => left.price - right.price);
  });

  readonly roomsNeeded = signal(1);
  readonly stayNights = signal(1);
  readonly confirmationSubtotal = signal(0);
  readonly couponDiscount = signal(0);
  readonly taxableAmount = signal(0);
  readonly cgstAmount = signal(0);
  readonly sgstAmount = signal(0);
  readonly bookingGrandTotal = signal(0);

  readonly searchForm = this.fb.nonNullable.group({
    cityCode: ['', Validators.required],
    hotelCode: ['', Validators.required],
    checkIn: ['', [Validators.required, futureOrTodayValidator()]],
    checkOut: ['', [Validators.required, afterDateValidator('checkIn'), maxStayDurationValidator('checkIn', 14)]],
    adults: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    children: [0, [Validators.required, Validators.min(0), Validators.max(5)]],
    roomType: ['', Validators.required]
  });

  readonly bookingForm = this.fb.nonNullable.group({
    paymentMethod: ['Card', Validators.required],
    couponCode: [''],
    specialRequests: ['']
  });

  readonly confirmationForm = this.fb.nonNullable.group({
    checkIn: [this.defaultCheckIn, [Validators.required, futureOrTodayValidator()]],
    checkOut: [this.defaultCheckOut, [Validators.required, afterDateValidator('checkIn'), maxStayDurationValidator('checkIn', 14)]],
    guestCount: [1, [Validators.required, Validators.min(1), Validators.max(12)]]
  });

  readonly paymentForm = this.fb.nonNullable.group({
    cardholderName: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(3), Validators.maxLength(50), lettersAndSpacesValidator()]],
    cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
    expiryDate: ['', [Validators.required, expiryDateValidator()]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
    billingAddress: ['', [Validators.minLength(5)]]
  });

  readonly complaintForm = this.fb.nonNullable.group({
    category: ['', Validators.required],
    bookingId: ['', Validators.required],
    title: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(10), Validators.maxLength(100)]],
    description: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(20), Validators.maxLength(500)]],
    contactPreference: ['Email', Validators.required]
  });

  readonly profileForm = this.fb.nonNullable.group({
    userId: [{ value: '', disabled: true }],
    name: ['', [Validators.required, trimmedRequiredValidator(), Validators.minLength(3), Validators.maxLength(50), lettersAndSpacesValidator()]],
    email: ['', [Validators.required, trimmedRequiredValidator(), Validators.email]],
    countryCode: ['+91', Validators.required],
    mobile: ['', [Validators.required, indianPhoneValidator()]],
    address: ['', [Validators.maxLength(100)]]
  });

  readonly modifyForm = this.fb.nonNullable.group({
    checkIn: ['', [Validators.required, futureOrTodayValidator()]],
    checkOut: ['', [Validators.required, afterDateValidator('checkIn'), maxStayDurationValidator('checkIn', 14)]],
    adults: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    children: [0, [Validators.required, Validators.min(0), Validators.max(5)]],
    roomType: ['', Validators.required]
  });

  readonly amountForm = this.fb.nonNullable.group({
    amount: [1, [Validators.required, positiveAmountValidator()]]
  });

  constructor() {
    if (!this.hotel.ensureRoleSession('customer')) {
      this.router.navigate(['/login']);
      return;
    }
    this.syncProfileForm();
    void this.initialize();
    this.searchForm.controls.checkIn.valueChanges.subscribe(() => {
      this.searchForm.controls.checkOut.updateValueAndValidity();
    });
    this.confirmationForm.controls.checkIn.valueChanges.subscribe(() => {
      this.confirmationForm.controls.checkOut.updateValueAndValidity();
    });
    this.confirmationForm.valueChanges.subscribe(() => {
      this.syncCalculatedAmount();
      this.handleCapacityPopup();
    });
    this.bookingForm.controls.couponCode.valueChanges.subscribe(() => {
      this.syncCalculatedAmount();
    });
    this.modifyForm.controls.checkIn.valueChanges.subscribe(() => {
      this.modifyForm.controls.checkOut.updateValueAndValidity();
    });
    this.syncCalculatedAmount();
  }

  get upcomingBookings(): Booking[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.customerBookings().filter((booking) => booking.checkOut >= today && booking.status !== 'Canceled');
  }

  get pastBookings(): Booking[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.customerBookings().filter((booking) => booking.checkOut < today || booking.status === 'Canceled');
  }

  get eligibleComplaintBookings(): Booking[] {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return this.customerBookings().filter((booking) => {
      if (booking.status === 'Canceled') {
        return false;
      }
      const checkIn = new Date(`${booking.checkIn}T00:00:00`);
      const checkOutPlusSeven = new Date(`${booking.checkOut}T00:00:00`);
      checkOutPlusSeven.setDate(checkOutPlusSeven.getDate() + 7);
      return now >= checkIn && now <= checkOutPlusSeven;
    });
  }

  get filteredResults(): Room[] {
    return [...this.searchResults]
      .filter((room) => (this.priceFilter === 'all' ? true : this.priceFilter === 'lt5000' ? room.price < 5000 : room.price >= 5000))
      .filter((room) => (this.amenityFilter ? room.amenities.includes(this.amenityFilter) : true))
      .filter((room) => (this.sizeFilter === 'all' ? true : this.sizeFilter === 'large' ? room.size >= 400 : room.size < 400))
      .sort((left, right) => {
        if (this.sortMode === 'low') {
          return left.price - right.price;
        }
        if (this.sortMode === 'high') {
          return right.price - left.price;
        }
        return Number(right.available) - Number(left.available);
      });
  }

  setSection(section: 'home' | 'bookings' | 'complaints' | 'contact' | 'profile'): void {
    this.activeSection = section;
    this.bookingMessage = '';
    this.complaintMessage = '';
    this.profileMessage = '';
    if (section === 'home') {
      this.resetHomeJourney();
    }
    if (section === 'complaints' && !this.eligibleComplaintBookings.length) {
      this.complaintMessage = 'Complaints can be raised from check-in date until 7 days after checkout.';
    }
  }

  updateHomeCity(value: string): void {
    this.selectedHomeCityCode.set(value);
    this.homeCurrentPage.set(1);
  }

  previousHomePage(): void {
    if (this.homeCurrentPage() > 1) {
      this.homeCurrentPage.update((page) => page - 1);
    }
  }

  nextHomePage(): void {
    if (this.homeCurrentPage() < this.totalHomePages()) {
      this.homeCurrentPage.update((page) => page + 1);
    }
  }

  getHotelCardImage(hotelCard: HotelCard): string {
    return this.hotelCardImages[hotelCard.cityCode] ?? this.hotelCardImages['DEFAULT'];
  }

  getHotelCardBadge(hotelCard: HotelCard): string {
    if (hotelCard.roomTypes.some((roomType) => roomType.toLowerCase().includes('lux'))) {
      return 'Top Rated | 4.6 star';
    }
    if (hotelCard.cityCode === 'BLR') {
      return 'Family Pick | 4.4 star';
    }
    return 'Family Pick | 4.5 star';
  }

  openHotelDetails(hotel: HotelCard): void {
    this.selectedHotelCard.set(hotel);
    this.selectedRoomCategory.set(null);
    this.selectedRoom = null;
    this.successData.set(null);
    this.homeStep.set('details');
  }

  backToHotelCards(): void {
    this.selectedHotelCard.set(null);
    this.selectedRoomCategory.set(null);
    this.selectedRoom = null;
    this.successData.set(null);
    this.showAdditionalRoomsPopup.set(false);
    this.lastCapacityPromptGuestCount = 0;
    this.proceedToPaymentAfterCapacityPopup = false;
    this.homeStep.set('listing');
  }

  selectRoomCategory(category: RoomCategoryCard): void {
    this.selectedRoomCategory.set(category);
    this.selectedRoom = category.rooms.find((room) => room.available) ?? category.rooms[0] ?? null;
    this.confirmationForm.reset({
      checkIn: this.defaultCheckIn,
      checkOut: this.defaultCheckOut,
      guestCount: 1
    });
    this.bookingForm.reset({
      paymentMethod: 'Card',
      couponCode: '',
      specialRequests: ''
    });
    this.paymentForm.reset({
      cardholderName: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      billingAddress: ''
    });
    this.showAdditionalRoomsPopup.set(false);
    this.lastCapacityPromptGuestCount = 0;
    this.proceedToPaymentAfterCapacityPopup = false;
    this.bookingMessage = '';
    this.syncCalculatedAmount();
    this.homeStep.set('confirmation');
  }

  continueToPayment(): void {
    if (this.confirmationForm.invalid || !this.selectedRoomCategory()) {
      this.confirmationForm.markAllAsTouched();
      return;
    }
    if (this.roomsNeeded() > 1) {
      this.proceedToPaymentAfterCapacityPopup = true;
      this.showAdditionalRoomsPopup.set(true);
      return;
    }
    this.homeStep.set('payment');
  }

  acceptAdditionalRooms(): void {
    this.showAdditionalRoomsPopup.set(false);
    const shouldProceed = this.proceedToPaymentAfterCapacityPopup;
    this.proceedToPaymentAfterCapacityPopup = false;
    if (shouldProceed) {
      this.homeStep.set('payment');
    }
  }

  closeAdditionalRoomsPopup(): void {
    this.showAdditionalRoomsPopup.set(false);
    this.proceedToPaymentAfterCapacityPopup = false;
  }

  backToConfirmation(): void {
    this.homeStep.set('confirmation');
  }

  requestPaymentConfirmation(): void {
    this.openConfirmationDialog({
      label: 'PAYMENT CONFIRMATION',
      title: 'Proceed with payment?',
      message: `This will complete your booking and charge Rs ${this.bookingGrandTotal()} for the selected room(s).`,
      confirmText: 'Pay Now'
    }, () => this.submitPayment());
  }

  async onSearchCityChange(): Promise<void> {
    const cityCode = this.searchForm.controls.cityCode.value;
    this.searchForm.controls.hotelCode.setValue('');
    this.hotels = cityCode ? await this.hotel.getCustomerHotels(cityCode) : [];
  }

  async searchRooms(): Promise<void> {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }
    this.searchPerformed = true;
    this.selectedRoom = null;
    this.bookingMessage = '';
    try {
      this.searchResults = await this.hotel.searchRooms(this.searchForm.getRawValue());
    } catch (error) {
      this.bookingMessage = error instanceof Error ? error.message : 'Unable to search rooms.';
      this.searchResults = [];
    }
  }

  startBooking(room: Room): void {
    const hotel = this.hotelCards().find((item) => item.hotelCode === room.hotelCode);
    if (hotel) {
      this.openHotelDetails(hotel);
      const category = this.selectedHotelRoomCategories().find((item) => item.roomType === room.roomType && item.bedType === room.bedType);
      if (category) {
        this.selectRoomCategory(category);
      }
    }
  }

  async submitPayment(): Promise<void> {
    if (!this.selectedRoomCategory() || !this.selectedHotelCard()) {
      return;
    }
    if (this.bookingForm.invalid || this.confirmationForm.invalid || !this.validatePaymentDetails()) {
      this.bookingForm.markAllAsTouched();
      this.confirmationForm.markAllAsTouched();
      return;
    }
    const hotel = this.selectedHotelCard();
    const category = this.selectedRoomCategory();
    if (!hotel || !category) {
      return;
    }
    const confirmation = this.confirmationForm.getRawValue();
    this.processingPayment.set(true);
    this.bookingMessage = '';
    try {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      const availableRooms = await this.hotel.searchRooms({
        cityCode: hotel.cityCode,
        hotelCode: hotel.hotelCode,
        checkIn: confirmation.checkIn,
        checkOut: confirmation.checkOut,
        adults: 1,
        children: 0,
        roomType: category.roomType
      });
      const selectableRooms = availableRooms.filter((room) => room.available).slice(0, this.roomsNeeded());
      if (selectableRooms.length < this.roomsNeeded()) {
        this.bookingMessage = `Only ${selectableRooms.length} room(s) are available for this selection. Please reduce guest count or choose another room type.`;
        this.homeStep.set('confirmation');
        return;
      }

      let remainingGuests = confirmation.guestCount;
      const bookingIds: string[] = [];
      for (const room of selectableRooms) {
        const guestsForRoom = Math.min(2, remainingGuests);
        remainingGuests -= guestsForRoom;
        const result = await this.hotel.createBooking({
          room,
          checkIn: confirmation.checkIn,
          checkOut: confirmation.checkOut,
          adults: guestsForRoom,
          children: 0,
          paymentMethod: this.bookingForm.controls.paymentMethod.value.trim(),
          specialRequests: this.bookingForm.controls.specialRequests.value.trim()
        });
        if (!result.success) {
          this.bookingMessage = result.message;
          this.homeStep.set('payment');
          return;
        }
        const bookingId = result.message.match(/booking code\s+([A-Z0-9-]+)/i)?.[1];
        if (bookingId) {
          bookingIds.push(bookingId);
        }
      }

      const invoiceNumber = `INV-${Date.now()}`;
      this.hotel.saveBookingPaidAmounts(bookingIds, this.bookingGrandTotal());
      this.successData.set({
        bookingIds,
        invoiceNumber,
        subtotal: this.confirmationSubtotal(),
        cgst: this.cgstAmount(),
        sgst: this.sgstAmount(),
        discount: this.couponDiscount(),
        total: this.bookingGrandTotal(),
        roomsBooked: this.roomsNeeded(),
        guestCount: confirmation.guestCount,
        hotelName: hotel.hotelName,
        cityName: hotel.cityName,
        roomType: category.roomType,
        checkIn: confirmation.checkIn,
        checkOut: confirmation.checkOut,
        paymentMethod: 'Card'
      });
      this.syncCalculatedAmount();
      this.homeStep.set('success');
    } finally {
      this.processingPayment.set(false);
    }
  }

  startModify(booking: Booking): void {
    this.editingBookingId = booking.bookingId;
    this.editingBooking = booking;
    this.modifyForm.reset({
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      roomType: booking.roomType
    });
  }

  async saveModification(): Promise<void> {
    if (!this.editingBookingId) {
      return;
    }
    if (this.modifyForm.invalid) {
      this.modifyForm.markAllAsTouched();
      return;
    }
    if (!this.editingBooking) {
      return;
    }
    try {
      const matchingRooms = await this.hotel.searchRooms({
        cityCode: this.editingBooking.cityCode,
        hotelCode: this.editingBooking.hotelCode,
        checkIn: this.modifyForm.controls.checkIn.value,
        checkOut: this.modifyForm.controls.checkOut.value,
        adults: this.modifyForm.controls.adults.value,
        children: this.modifyForm.controls.children.value,
        roomType: this.modifyForm.controls.roomType.value
      });
      const room = matchingRooms.find((item) => item.available);
      if (!room) {
        this.bookingMessage = 'The selected room type is fully booked for these dates. Please choose another option.';
        return;
      }
      const response = await this.hotel.updateBooking(this.editingBookingId, {
        checkIn: this.modifyForm.controls.checkIn.value,
        checkOut: this.modifyForm.controls.checkOut.value,
        adults: this.modifyForm.controls.adults.value,
        children: this.modifyForm.controls.children.value,
        roomType: room.roomType,
        roomNumber: room.roomNumber,
        roomId: room.id
      });
      this.bookingMessage = response.message;
      this.editingBookingId = null;
      this.editingBooking = null;
    } catch (error) {
      this.bookingMessage = error instanceof Error ? error.message : 'Unable to modify booking.';
    }
  }

  requestSaveModificationConfirmation(): void {
    this.openConfirmationDialog({
      label: 'BOOKING UPDATE',
      title: 'Save booking changes?',
      message: 'Your booking dates, guest details, or room type will be updated for this reservation.',
      confirmText: 'Save Changes'
    }, () => this.saveModification());
  }

  async cancelBooking(booking: Booking): Promise<void> {
    try {
      const result = await this.hotel.cancelBooking(booking.bookingId);
      this.bookingMessage = result.message.toLowerCase().includes('non-refundable')
        ? `Booking ${booking.bookingId} has been canceled successfully. As per the hotel policy, this booking is non-refundable.`
        : result.message;
    } catch (error) {
      this.bookingMessage = error instanceof Error ? error.message : 'Unable to cancel booking.';
    }
  }

  requestCancelBookingConfirmation(booking: Booking): void {
    this.openConfirmationDialog({
      label: 'BOOKING CANCELLATION',
      title: 'Cancel this booking?',
      message: `This will cancel booking ${booking.bookingId} for ${booking.hotelName}. Please confirm before continuing.`,
      confirmText: 'Cancel Booking'
    }, () => this.cancelBooking(booking));
  }

  async submitComplaint(): Promise<void> {
    if (this.complaintForm.invalid) {
      this.complaintForm.markAllAsTouched();
      return;
    }
    const user = this.currentUser();
    if (!user) {
      return;
    }
    if (!this.eligibleComplaintBookings.length) {
      this.complaintMessage = 'Complaints can be raised from check-in date until 7 days after checkout.';
      return;
    }
    const formValue = this.complaintForm.getRawValue();
    try {
      const complaint = await this.hotel.createComplaint({
        userId: user.userId,
        bookingId: formValue.bookingId,
        category: formValue.category,
        title: formValue.title.trim(),
        description: formValue.description.trim(),
        contactPreference: formValue.contactPreference as 'Call' | 'Email'
      });
      this.selectedComplaint = complaint;
      this.complaintMessage = `Your complaint has been successfully submitted. Complaint ID: ${complaint.complaintId}. Our support team will get back to you soon.`;
      this.complaintForm.reset({
        category: '',
        bookingId: '',
        title: '',
        description: '',
        contactPreference: 'Email'
      });
    } catch (error) {
      this.complaintMessage = error instanceof Error ? error.message : 'Unable to submit complaint.';
    }
  }

  requestComplaintConfirmation(): void {
    this.openConfirmationDialog({
      label: 'COMPLAINT SUBMISSION',
      title: 'Submit this complaint?',
      message: 'Please confirm that the complaint details are correct before sending them to support.',
      confirmText: 'Submit Complaint'
    }, () => this.submitComplaint());
  }

  openComplaint(complaint: Complaint): void {
    this.selectedComplaint = complaint;
  }

  async updateComplaintStatus(status: 'Closed' | 'Open'): Promise<void> {
    if (!this.selectedComplaint) {
      return;
    }
    await this.hotel.updateComplaint(this.selectedComplaint.complaintId, { status });
    this.selectedComplaint = this.hotel.complaints().find((complaint) => complaint.complaintId === this.selectedComplaint?.complaintId) ?? { ...this.selectedComplaint, status };
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const raw = this.profileForm.getRawValue();
    try {
      const response = await this.hotel.updateProfile({
        name: raw.name.trim(),
        email: raw.email.trim().toLowerCase(),
        countryCode: raw.countryCode,
        mobile: raw.mobile.trim(),
        address: raw.address.trim()
      });
      this.profileMessage = response.message;
      this.syncProfileForm();
    } catch (error) {
      this.profileMessage = error instanceof Error ? error.message : 'Unable to update profile.';
    }
  }

  requestProfileSaveConfirmation(): void {
    this.openConfirmationDialog({
      label: 'PROFILE UPDATE',
      title: 'Save profile changes?',
      message: 'Your customer profile information will be updated with the details entered here.',
      confirmText: 'Save Profile'
    }, () => this.saveProfile());
  }

  logout(): void {
    this.hotel.logout();
    this.router.navigate(['/login']);
  }

  requestLogoutConfirmation(): void {
    this.openConfirmationDialog({
      label: 'LOGOUT CONFIRMATION',
      title: 'Logout now?',
      message: 'You will be signed out of the customer portal and returned to the login page.',
      confirmText: 'Logout'
    }, () => this.logout());
  }

  normalizeDigits(controlName: 'cardNumber' | 'cvv', max: number): void {
    const control = this.paymentForm.controls[controlName];
    const normalized = control.value.replace(/\D/g, '').slice(0, max);
    if (normalized !== control.value) {
      control.setValue(normalized);
    }
  }

  normalizeExpiry(): void {
    const control = this.paymentForm.controls.expiryDate;
    const digits = control.value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    if (formatted !== control.value) {
      control.setValue(formatted);
    }
  }

  nightsForSelectedRoom(): number {
    const raw = this.searchForm.getRawValue();
    if (!raw.checkIn || !raw.checkOut) {
      return 0;
    }
    const diff = new Date(raw.checkOut).getTime() - new Date(raw.checkIn).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  totalForSelectedRoom(): number {
    return Math.round(this.bookingGrandTotal());
  }

  downloadReceipt(): void {
    const success = this.successData();
    if (!success) {
      return;
    }
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const left = 48;
    let y = 54;
    const writeLine = (label: string, value: string, gap = 24) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, left, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, 190, y);
      y += gap;
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('HM Hotels Booking Invoice', left, y);
    y += 30;

    pdf.setFontSize(11);
    writeLine('Invoice Number', success.invoiceNumber);
    writeLine('Booking IDs', success.bookingIds.join(', '));
    writeLine('Hotel', `${success.hotelName}, ${success.cityName}`);
    writeLine('Room Type', success.roomType);
    writeLine('Check-in', success.checkIn);
    writeLine('Check-out', success.checkOut);
    writeLine('Guests', `${success.guestCount}`);
    writeLine('Rooms Booked', `${success.roomsBooked}`);
    writeLine('Payment Method', success.paymentMethod);

    y += 8;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(left, y, 548, y);
    y += 24;

    writeLine('Subtotal', `Rs ${success.subtotal}`);
    writeLine('Discount', `Rs ${success.discount}`);
    writeLine('CGST', `Rs ${success.cgst}`);
    writeLine('SGST', `Rs ${success.sgst}`);

    y += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total Paid', left, y);
    pdf.text(`Rs ${success.total}`, 190, y);
    y += 30;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('This is a system-generated PDF invoice for your booking.', left, y);

    pdf.save(`${success.invoiceNumber}.pdf`);
  }

  requestDownloadReceiptConfirmation(): void {
    this.openConfirmationDialog({
      label: 'RECEIPT DOWNLOAD',
      title: 'Download booking receipt?',
      message: 'This will generate and download the receipt for your confirmed booking.',
      confirmText: 'Download'
    }, () => this.downloadReceipt());
  }

  closeConfirmationDialog(): void {
    this.confirmationDialog.set(null);
    this.pendingConfirmationAction = null;
  }

  async confirmDialogAction(): Promise<void> {
    const action = this.pendingConfirmationAction;
    this.closeConfirmationDialog();
    if (action) {
      await action();
    }
  }

  goToBookingsSection(): void {
    this.setSection('bookings');
  }

  goBackHome(): void {
    this.setSection('home');
  }

  private syncProfileForm(): void {
    const user = this.currentUser();
    if (!user) {
      return;
    }
    this.profileForm.reset({
      userId: user.userId,
      name: user.name,
      email: user.email,
      countryCode: user.countryCode,
      mobile: user.mobile,
      address: user.address
    });
  }

  private async initialize(): Promise<void> {
    try {
      this.cities = await this.hotel.getCustomerCities();
      await this.loadHomeRooms();
      await this.hotel.loadCustomerData();
      if (!this.eligibleComplaintBookings.length) {
        this.complaintMessage = 'Complaints can be raised from check-in date until 7 days after checkout.';
      }
      this.syncProfileForm();
    } catch {
      this.router.navigate(['/login']);
    }
  }

  private async loadHomeRooms(): Promise<void> {
    this.homeLoading.set(true);
    this.homeLoadMessage.set('');
    try {
      this.homeRooms.set(await this.hotel.getPublicRooms());
      this.homeCurrentPage.set(1);
    } catch {
      this.homeRooms.set([]);
      this.homeLoadMessage.set('Unable to load rooms right now. Please try again in a moment.');
    } finally {
      this.homeLoading.set(false);
    }
  }

  private validatePaymentDetails(): boolean {
    this.paymentForm.markAllAsTouched();
    return this.paymentForm.controls.cardholderName.valid
      && this.paymentForm.controls.cardNumber.valid
      && this.paymentForm.controls.expiryDate.valid
      && this.paymentForm.controls.cvv.valid;
  }

  private resetHomeJourney(): void {
    this.homeStep.set('listing');
    this.selectedHotelCard.set(null);
    this.selectedRoomCategory.set(null);
    this.selectedRoom = null;
    this.showAdditionalRoomsPopup.set(false);
    this.lastCapacityPromptGuestCount = 0;
    this.proceedToPaymentAfterCapacityPopup = false;
    this.successData.set(null);
    this.processingPayment.set(false);
    this.bookingMessage = '';
    this.syncCalculatedAmount();
  }

  private handleCapacityPopup(): void {
    if (this.homeStep() !== 'confirmation') {
      return;
    }
    const guestCount = Math.max(1, Number(this.confirmationForm.controls.guestCount.value) || 1);
    if (guestCount > 2) {
      if (guestCount !== this.lastCapacityPromptGuestCount) {
        this.showAdditionalRoomsPopup.set(true);
        this.proceedToPaymentAfterCapacityPopup = false;
        this.lastCapacityPromptGuestCount = guestCount;
      }
      return;
    }
    this.lastCapacityPromptGuestCount = 0;
    this.proceedToPaymentAfterCapacityPopup = false;
    this.showAdditionalRoomsPopup.set(false);
  }

  private openConfirmationDialog(
    dialog: ConfirmationDialogState,
    action: () => void | Promise<void>
  ): void {
    this.pendingConfirmationAction = action;
    this.confirmationDialog.set(dialog);
  }

  private parseLocalDate(value: string): Date | null {
    const normalized = value.trim();
    const parts = normalized.split('-').map((part) => Number(part));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return null;
    }
    const [first, second, third] = parts;
    const [year, month, day] = first > 999 ? [first, second, third] : [third, second, first];
    return new Date(year, month - 1, day);
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + days);
    return next;
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  syncCalculatedAmount(): void {
    const room = this.selectedRoomCategory();
    const confirmation = this.confirmationForm.getRawValue();
    const guestCount = Math.max(1, Number(confirmation.guestCount) || 1);
    const roomsNeeded = Math.max(1, Math.ceil(guestCount / 2));
    const checkIn = confirmation.checkIn || this.defaultCheckIn;
    const checkOut = confirmation.checkOut || this.defaultCheckOut;
    const checkInDate = this.parseLocalDate(checkIn);
    const checkOutDate = this.parseLocalDate(checkOut);
    const stayNights = checkInDate && checkOutDate
      ? Math.max(0, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    const subtotal = room ? room.price * roomsNeeded * stayNights : 0;
    const code = this.bookingForm.controls.couponCode.value.trim().toUpperCase();

    let discount = 0;
    if (subtotal && code === 'SAVE10') {
      discount = Math.round(subtotal * 0.1);
    } else if (subtotal && code === 'HM500') {
      discount = Math.min(500, subtotal);
    } else if (subtotal && code === 'LUXE15') {
      discount = Math.min(Math.round(subtotal * 0.15), 2000);
    }

    const taxableAmount = Math.max(0, subtotal - discount);
    const cgst = Math.round(taxableAmount * 0.09);
    const sgst = Math.round(taxableAmount * 0.09);
    const total = taxableAmount + cgst + sgst;

    this.roomsNeeded.set(roomsNeeded);
    this.stayNights.set(stayNights);
    this.confirmationSubtotal.set(subtotal);
    this.couponDiscount.set(discount);
    this.taxableAmount.set(taxableAmount);
    this.cgstAmount.set(cgst);
    this.sgstAmount.set(sgst);
    this.bookingGrandTotal.set(total);
    this.amountForm.controls.amount.setValue(total, { emitEvent: false });
  }
}
