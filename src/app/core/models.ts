export type UserRole = 'customer' | 'admin' | 'staff';
export type AccountStatus = 'Active' | 'Inactive' | 'Locked';
export type BookingStatus = 'Confirmed' | 'Checked-in' | 'Checked-out' | 'Canceled';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partially Paid';
export type ComplaintStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';

export interface AppUser {
  userId: string;
  name: string;
  email: string;
  countryCode: string;
  mobile: string;
  address: string;
  username: string;
  password: string;
  role: UserRole;
  status: AccountStatus;
  failedAttempts: number;
  firstLogin: boolean;
}

export interface CityOption {
  cityCode: string;
  cityName: string;
  stateName: string;
}

export interface HotelOption {
  hotelCode: string;
  hotelName: string;
  cityCode: string;
  cityName: string;
}

export interface Room {
  id: string;
  cityCode: string;
  cityName: string;
  hotelCode: string;
  hotelName: string;
  roomNumber: string;
  roomType: string;
  bedType: string;
  price: number;
  amenities: string[];
  available: boolean;
  maxAdults: number;
  maxChildren: number;
  size: number;
  status: 'Available' | 'Occupied' | 'Under Maintenance';
  description: string;
}

export interface Booking {
  bookingId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  cityCode: string;
  cityName: string;
  hotelCode: string;
  hotelName: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  bookedOn: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  amount: number;
  specialRequests: string;
  bookingDate: string;
  transactionId?: string;
  canceledOn?: string;
  refundAmount?: number;
}

export interface Complaint {
  complaintId: string;
  userId: string;
  bookingId: string;
  category: string;
  title: string;
  description: string;
  contactPreference: 'Call' | 'Email';
  status: ComplaintStatus;
  submittedOn: string;
  expectedResolution: string;
  response?: string;
  resolutionNotes?: string;
  assignedTo?: string;
  assignedAt?: string;
  resolvedAt?: string;
  priority: 'Low' | 'Medium' | 'High';
}

export interface Bill {
  billId: string;
  customerId: string;
  customerName: string;
  issuedOn: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  roomCharges: number;
  serviceCharges: number;
  tax: number;
  discount: number;
}

export interface RoomSearchCriteria {
  cityCode: string;
  hotelCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomType: string;
}
