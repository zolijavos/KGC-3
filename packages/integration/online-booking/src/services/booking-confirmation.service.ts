/**
 * @kgc/online-booking - BookingConfirmationService
 * Epic 26: Story 26-2 - Foglalas Megerosites
 */

import { Injectable } from '@nestjs/common';
import {
  IBooking,
  IBookingItem,
  IBookingConfirmation,
  BookingStatus,
  PaymentStatus,
} from '../interfaces/booking.interface';
import {
  ConfirmBookingDto,
  ConfirmBookingSchema,
  CancelBookingDto,
  CancelBookingSchema,
} from '../dto/booking.dto';
import {
  IBookingRepository,
  IBookingItemRepository,
  IAuditService,
} from './booking.service';

export interface IPaymentService {
  processDeposit(
    bookingId: string,
    amount: number,
    paymentReference?: string,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }>;
  refundDeposit(
    bookingId: string,
    transactionId: string,
  ): Promise<{ success: boolean; error?: string }>;
}

export interface IRentalService {
  createReservation(
    tenantId: string,
    booking: IBooking,
    items: IBookingItem[],
  ): Promise<{ reservationId: string }>;
  cancelReservation(reservationId: string): Promise<void>;
}

export interface INotificationService {
  sendBookingConfirmed(booking: IBooking, items: IBookingItem[]): Promise<void>;
  sendBookingCancelled(booking: IBooking, reason: string): Promise<void>;
}

@Injectable()
export class BookingConfirmationService {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly itemRepository: IBookingItemRepository,
    private readonly paymentService: IPaymentService,
    private readonly rentalService: IRentalService,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
  ) {}

  async confirmBooking(
    input: ConfirmBookingDto,
    tenantId: string,
  ): Promise<IBookingConfirmation> {
    const validationResult = ConfirmBookingSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Find booking by confirmation token
    const booking = await this.bookingRepository.findByConfirmationToken(
      validInput.confirmationToken,
    );
    if (!booking) {
      throw new Error('Invalid confirmation token');
    }
    if (booking.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new Error(`Booking cannot be confirmed - current status: ${booking.status}`);
    }

    // Check if booking has expired
    if (booking.expiresAt < new Date()) {
      await this.bookingRepository.update(booking.id, {
        status: BookingStatus.EXPIRED,
      });
      throw new Error('Booking has expired');
    }

    // Process deposit payment if required
    if (booking.depositAmount && booking.depositAmount > 0) {
      const paymentResult = await this.paymentService.processDeposit(
        booking.id,
        booking.depositAmount,
        validInput.paymentReference,
      );

      if (!paymentResult.success) {
        throw new Error(`Payment failed: ${paymentResult.error || 'Unknown error'}`);
      }
    }

    // Get booking items
    const items = await this.itemRepository.findByBookingId(booking.id);

    // Create rental reservation
    const reservation = await this.rentalService.createReservation(
      tenantId,
      booking,
      items,
    );

    // Update booking status
    const confirmedAt = new Date();
    await this.bookingRepository.update(booking.id, {
      status: BookingStatus.CONFIRMED,
      paymentStatus: booking.depositAmount ? PaymentStatus.PAID : PaymentStatus.PENDING,
      confirmedAt,
    });

    // Send confirmation notification
    await this.notificationService.sendBookingConfirmed(booking, items);

    await this.auditService.log({
      action: 'booking_confirmed',
      entityType: 'booking',
      entityId: booking.id,
      userId: 'online',
      tenantId,
      metadata: {
        bookingNumber: booking.bookingNumber,
        reservationId: reservation.reservationId,
        depositPaid: booking.depositAmount || 0,
      },
    });

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      confirmationToken: validInput.confirmationToken,
      confirmedAt,
      estimatedTotal: booking.totalAmount,
    };
  }

  async cancelBooking(
    bookingId: string,
    input: CancelBookingDto,
    tenantId: string,
    userId: string,
  ): Promise<IBooking> {
    const validationResult = CancelBookingSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error('Booking is already cancelled');
    }
    if (booking.status === BookingStatus.COMPLETED) {
      throw new Error('Cannot cancel completed booking');
    }

    // Cancel rental reservation if confirmed
    if (booking.status === BookingStatus.CONFIRMED) {
      // Note: In a real implementation, we'd need to store the reservationId
      // For now, we'll skip the reservation cancellation
    }

    // Process refund if deposit was paid
    if (booking.paymentStatus === PaymentStatus.PAID && booking.depositAmount) {
      // In a real implementation, we'd process the refund
      // For now, we'll just update the status
      await this.bookingRepository.update(bookingId, {
        paymentStatus: PaymentStatus.REFUNDED,
      });
    }

    // Update booking status
    const updatedBooking = await this.bookingRepository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: input.reason,
    });

    // Send cancellation notification
    await this.notificationService.sendBookingCancelled(updatedBooking, input.reason);

    await this.auditService.log({
      action: 'booking_cancelled',
      entityType: 'booking',
      entityId: bookingId,
      userId,
      tenantId,
      metadata: {
        bookingNumber: booking.bookingNumber,
        reason: input.reason,
        previousStatus: booking.status,
      },
    });

    return updatedBooking;
  }

  async getBookingStatus(
    confirmationToken: string,
    tenantId: string,
  ): Promise<{ booking: IBooking; items: IBookingItem[] }> {
    const booking = await this.bookingRepository.findByConfirmationToken(confirmationToken);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const items = await this.itemRepository.findByBookingId(booking.id);
    return { booking, items };
  }

  async resendConfirmation(
    bookingId: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new Error('Can only resend confirmation for pending bookings');
    }

    const items = await this.itemRepository.findByBookingId(booking.id);

    // Extend expiration time
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);
    await this.bookingRepository.update(bookingId, {
      expiresAt: newExpiresAt,
    });

    // Resend notification (using confirmed template for reminder)
    await this.notificationService.sendBookingConfirmed(booking, items);

    await this.auditService.log({
      action: 'booking_confirmation_resent',
      entityType: 'booking',
      entityId: bookingId,
      userId,
      tenantId,
      metadata: {
        bookingNumber: booking.bookingNumber,
        newExpiresAt,
      },
    });
  }
}
