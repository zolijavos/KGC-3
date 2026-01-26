/**
 * In-Memory Service Implementations
 * Epic 26: Online Booking
 *
 * Mock services for equipment, payment, rental, notifications, and audit
 */

import {
  IAuditService,
  IBooking,
  IBookingItem,
  IBookingNotificationService,
  IConfirmationNotificationService,
  IEquipmentService,
  IPaymentService,
  IRentalService,
} from '@kgc/online-booking';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryEquipmentService implements IEquipmentService {
  private equipment = new Map<
    string,
    { id: string; code: string; name: string; dailyRate: number }
  >();

  constructor() {
    // Seed test equipment
    this.equipment.set('eq-001', {
      id: 'eq-001',
      code: 'BG-001',
      name: 'Makita Fúrógép',
      dailyRate: 5000,
    });
    this.equipment.set('eq-002', {
      id: 'eq-002',
      code: 'BG-002',
      name: 'Bosch Sarokcsiszoló',
      dailyRate: 4000,
    });
    this.equipment.set('eq-003', {
      id: 'eq-003',
      code: 'BG-003',
      name: 'DeWalt Ütvefúró',
      dailyRate: 6000,
    });
  }

  async checkAvailability(
    _tenantId: string,
    equipmentId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<{ available: boolean; conflictingBookings: string[] }> {
    // Mock: equipment is available unless ID ends with 'X'
    const available = !equipmentId.endsWith('X');
    return { available, conflictingBookings: available ? [] : ['FOG-2026-00001'] };
  }

  async getEquipmentById(
    id: string
  ): Promise<{ id: string; code: string; name: string; dailyRate: number } | null> {
    return this.equipment.get(id) ?? null;
  }
}

@Injectable()
export class InMemoryBookingNotificationService implements IBookingNotificationService {
  private notifications: Array<{ type: string; booking: IBooking; timestamp: Date }> = [];

  async sendBookingCreated(booking: IBooking, _items: IBookingItem[]): Promise<void> {
    this.notifications.push({ type: 'created', booking, timestamp: new Date() });
    console.log(`[NOTIFICATION] Booking created: ${booking.bookingNumber}`);
  }

  async sendBookingReminder(booking: IBooking): Promise<void> {
    this.notifications.push({ type: 'reminder', booking, timestamp: new Date() });
    console.log(`[NOTIFICATION] Booking reminder: ${booking.bookingNumber}`);
  }

  getNotifications(): typeof this.notifications {
    return [...this.notifications];
  }
}

@Injectable()
export class InMemoryPaymentService implements IPaymentService {
  async processDeposit(
    bookingId: string,
    amount: number,
    _paymentReference?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // Mock: payments succeed unless amount is negative
    if (amount < 0) {
      return { success: false, error: 'Invalid amount' };
    }
    return { success: true, transactionId: `TXN-${bookingId}-${Date.now()}` };
  }

  async refundDeposit(
    _bookingId: string,
    _transactionId: string
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}

@Injectable()
export class InMemoryRentalService implements IRentalService {
  async createReservation(
    _tenantId: string,
    booking: IBooking,
    _items: IBookingItem[]
  ): Promise<{ reservationId: string }> {
    return { reservationId: `RES-${booking.id.slice(0, 8)}` };
  }

  async cancelReservation(_reservationId: string): Promise<void> {
    // Mock implementation
  }
}

@Injectable()
export class InMemoryConfirmationNotificationService implements IConfirmationNotificationService {
  private notifications: Array<{
    type: string;
    booking: IBooking;
    reason?: string;
    timestamp: Date;
  }> = [];

  async sendBookingConfirmed(booking: IBooking, _items: IBookingItem[]): Promise<void> {
    this.notifications.push({ type: 'confirmed', booking, timestamp: new Date() });
    console.log(`[NOTIFICATION] Booking confirmed: ${booking.bookingNumber}`);
  }

  async sendBookingCancelled(booking: IBooking, reason: string): Promise<void> {
    this.notifications.push({ type: 'cancelled', booking, reason, timestamp: new Date() });
    console.log(`[NOTIFICATION] Booking cancelled: ${booking.bookingNumber} - ${reason}`);
  }

  getNotifications(): typeof this.notifications {
    return [...this.notifications];
  }
}

@Injectable()
export class InMemoryAuditService implements IAuditService {
  private logs: Array<{
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
    timestamp: Date;
  }> = [];

  async log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.logs.push({ ...entry, timestamp: new Date() });
    console.log(`[AUDIT] ${entry.action} - ${entry.entityType}:${entry.entityId}`);
  }

  getLogs(): typeof this.logs {
    return [...this.logs];
  }
}
