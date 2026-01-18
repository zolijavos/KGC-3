/**
 * @kgc/online-booking - Online Booking Module
 * Epic 26: Online Booking
 */

import { Module } from '@nestjs/common';
import { BookingService } from './services/booking.service';
import { BookingConfirmationService } from './services/booking-confirmation.service';

@Module({
  providers: [BookingService, BookingConfirmationService],
  exports: [BookingService, BookingConfirmationService],
})
export class OnlineBookingModule {}
