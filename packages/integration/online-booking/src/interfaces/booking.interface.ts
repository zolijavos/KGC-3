/**
 * @kgc/online-booking - Online Booking Interfaces
 * Epic 26: Online Booking
 */

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
}

export enum BookingType {
  RENTAL = 'RENTAL',
  SERVICE = 'SERVICE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface IBooking {
  id: string;
  tenantId: string;
  bookingNumber: string;
  type: BookingType;
  status: BookingStatus;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  totalAmount: number;
  depositAmount?: number;
  paymentStatus: PaymentStatus;
  confirmationToken?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBookingItem {
  id: string;
  bookingId: string;
  tenantId: string;
  equipmentId?: string;
  equipmentCode?: string;
  equipmentName: string;
  quantity: number;
  dailyRate: number;
  totalDays?: number;
  itemTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
  capacity: number;
  booked: number;
}

export interface IAvailabilityCheck {
  equipmentId: string;
  startDate: Date;
  endDate: Date;
  available: boolean;
  conflictingBookings?: string[];
}

export interface IBookingConfirmation {
  bookingId: string;
  bookingNumber: string;
  confirmationToken: string;
  confirmedAt: Date;
  estimatedTotal: number;
}
