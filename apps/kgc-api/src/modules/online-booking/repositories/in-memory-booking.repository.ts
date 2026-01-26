/**
 * In-Memory Booking Repository
 * Epic 26: Online Booking
 *
 * Development implementation - replace with Prisma for production
 */

import {
  BookingStatus,
  BookingType,
  IBooking,
  IBookingItem,
  IBookingItemRepository,
  IBookingRepository,
  PaymentStatus,
} from '@kgc/online-booking';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryBookingRepository implements IBookingRepository {
  private bookings: Map<string, IBooking> = new Map();
  private sequenceCounter: Map<string, number> = new Map();

  async create(data: Partial<IBooking>): Promise<IBooking> {
    const now = new Date();
    const id = randomUUID();
    const booking: IBooking = {
      id,
      tenantId: data.tenantId ?? '',
      bookingNumber: data.bookingNumber ?? '',
      type: data.type ?? BookingType.RENTAL,
      status: data.status ?? BookingStatus.PENDING,
      customerName: data.customerName ?? '',
      customerEmail: data.customerEmail ?? '',
      customerPhone: data.customerPhone ?? '',
      startDate: data.startDate ?? now,
      totalAmount: data.totalAmount ?? 0,
      paymentStatus: data.paymentStatus ?? PaymentStatus.PENDING,
      confirmationToken: data.confirmationToken ?? '',
      expiresAt: data.expiresAt ?? now,
      createdAt: now,
      updatedAt: now,
      ...(data.endDate && { endDate: data.endDate }),
      ...(data.notes && { notes: data.notes }),
      ...(data.depositAmount && { depositAmount: data.depositAmount }),
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async findById(id: string): Promise<IBooking | null> {
    return this.bookings.get(id) ?? null;
  }

  async findByBookingNumber(bookingNumber: string): Promise<IBooking | null> {
    for (const booking of this.bookings.values()) {
      if (booking.bookingNumber === bookingNumber) {
        return booking;
      }
    }
    return null;
  }

  async findByConfirmationToken(token: string): Promise<IBooking | null> {
    for (const booking of this.bookings.values()) {
      if (booking.confirmationToken === token) {
        return booking;
      }
    }
    return null;
  }

  async findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<IBooking[]> {
    const results: IBooking[] = [];
    for (const booking of this.bookings.values()) {
      if (
        booking.tenantId === tenantId &&
        booking.startDate >= startDate &&
        booking.startDate <= endDate
      ) {
        results.push(booking);
      }
    }
    return results;
  }

  async findPendingExpired(before: Date): Promise<IBooking[]> {
    const results: IBooking[] = [];
    for (const booking of this.bookings.values()) {
      if (booking.status === BookingStatus.PENDING && booking.expiresAt < before) {
        results.push(booking);
      }
    }
    return results;
  }

  async update(id: string, data: Partial<IBooking>): Promise<IBooking> {
    const existing = this.bookings.get(id);
    if (!existing) {
      throw new Error('Booking not found');
    }

    const updated: IBooking = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.bookings.set(id, updated);
    return updated;
  }

  async getNextSequence(tenantId: string, year: number): Promise<number> {
    const key = `${tenantId}-${year}`;
    const current = this.sequenceCounter.get(key) ?? 0;
    const next = current + 1;
    this.sequenceCounter.set(key, next);
    return next;
  }
}

@Injectable()
export class InMemoryBookingItemRepository implements IBookingItemRepository {
  private items: Map<string, IBookingItem> = new Map();

  async createMany(items: Partial<IBookingItem>[]): Promise<IBookingItem[]> {
    const now = new Date();
    const created: IBookingItem[] = [];

    for (const item of items) {
      const id = randomUUID();
      const bookingItem: IBookingItem = {
        id,
        tenantId: item.tenantId ?? '',
        bookingId: item.bookingId ?? '',
        equipmentId: item.equipmentId ?? '',
        equipmentCode: item.equipmentCode ?? '',
        equipmentName: item.equipmentName ?? '',
        quantity: item.quantity ?? 1,
        dailyRate: item.dailyRate ?? 0,
        totalDays: item.totalDays ?? 1,
        itemTotal: item.itemTotal ?? 0,
        createdAt: now,
        updatedAt: now,
      };
      this.items.set(id, bookingItem);
      created.push(bookingItem);
    }

    return created;
  }

  async findByBookingId(bookingId: string): Promise<IBookingItem[]> {
    const results: IBookingItem[] = [];
    for (const item of this.items.values()) {
      if (item.bookingId === bookingId) {
        results.push(item);
      }
    }
    return results;
  }

  async deleteByBookingId(bookingId: string): Promise<void> {
    for (const [id, item] of this.items.entries()) {
      if (item.bookingId === bookingId) {
        this.items.delete(id);
      }
    }
  }
}
