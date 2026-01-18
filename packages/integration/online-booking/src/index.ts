/**
 * @kgc/online-booking - Online Booking Module
 * Epic 26: Online Booking
 */

// Module
export { OnlineBookingModule } from './online-booking.module';

// Services
export {
  BookingService,
  IBookingRepository,
  IBookingItemRepository,
  IEquipmentService,
  INotificationService as IBookingNotificationService,
  IAuditService,
} from './services/booking.service';

export {
  BookingConfirmationService,
  IPaymentService,
  IRentalService,
  INotificationService as IConfirmationNotificationService,
} from './services/booking-confirmation.service';

// Interfaces
export {
  IBooking,
  IBookingItem,
  ITimeSlot,
  IAvailabilityCheck,
  IBookingConfirmation,
  BookingStatus,
  BookingType,
  PaymentStatus,
} from './interfaces/booking.interface';

// DTOs
export {
  CreateBookingDto,
  CreateBookingSchema,
  BookingItemDto,
  BookingItemSchema,
  ConfirmBookingDto,
  ConfirmBookingSchema,
  CancelBookingDto,
  CancelBookingSchema,
  CheckAvailabilityDto,
  CheckAvailabilitySchema,
  GetTimeSlotsDto,
  GetTimeSlotsSchema,
} from './dto/booking.dto';
