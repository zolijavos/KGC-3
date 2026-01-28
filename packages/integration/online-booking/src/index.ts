/**
 * @kgc/online-booking - Online Booking Module
 * Epic 26: Online Booking
 */

// Module
export { OnlineBookingModule } from './online-booking.module';

// Services
export { BookingService } from './services/booking.service';
export type {
  IAuditService,
  IBookingItemRepository,
  INotificationService as IBookingNotificationService,
  IBookingRepository,
  IEquipmentService,
} from './services/booking.service';

export { BookingConfirmationService } from './services/booking-confirmation.service';
export type {
  INotificationService as IConfirmationNotificationService,
  IPaymentService,
  IRentalService,
} from './services/booking-confirmation.service';

// Interfaces - enums are runtime values, interfaces need export type
export { BookingStatus, BookingType, PaymentStatus } from './interfaces/booking.interface';
export type {
  IAvailabilityCheck,
  IBooking,
  IBookingConfirmation,
  IBookingItem,
  ITimeSlot,
} from './interfaces/booking.interface';

// DTOs - schemas are runtime values, types need export type
export {
  BookingItemSchema,
  CancelBookingSchema,
  CheckAvailabilitySchema,
  ConfirmBookingSchema,
  CreateBookingSchema,
  GetTimeSlotsSchema,
} from './dto/booking.dto';
export type {
  BookingItemDto,
  CancelBookingDto,
  CheckAvailabilityDto,
  ConfirmBookingDto,
  CreateBookingDto,
  GetTimeSlotsDto,
} from './dto/booking.dto';
