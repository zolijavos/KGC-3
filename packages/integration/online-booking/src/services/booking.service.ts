/**
 * @kgc/online-booking - BookingService
 * Epic 26: Story 26-1 - Online Foglalas Felulet
 */

import { Injectable } from '@nestjs/common';
import {
  IBooking,
  IBookingItem,
  IAvailabilityCheck,
  ITimeSlot,
  BookingStatus,
  BookingType,
  PaymentStatus,
} from '../interfaces/booking.interface';
import {
  CreateBookingDto,
  CreateBookingSchema,
  CheckAvailabilityDto,
  CheckAvailabilitySchema,
  GetTimeSlotsDto,
  GetTimeSlotsSchema,
} from '../dto/booking.dto';
import { randomBytes } from 'crypto';

export interface IBookingRepository {
  create(data: Partial<IBooking>): Promise<IBooking>;
  findById(id: string): Promise<IBooking | null>;
  findByBookingNumber(bookingNumber: string): Promise<IBooking | null>;
  findByConfirmationToken(token: string): Promise<IBooking | null>;
  findByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<IBooking[]>;
  findPendingExpired(before: Date): Promise<IBooking[]>;
  update(id: string, data: Partial<IBooking>): Promise<IBooking>;
  getNextSequence(tenantId: string, year: number): Promise<number>;
}

export interface IBookingItemRepository {
  createMany(items: Partial<IBookingItem>[]): Promise<IBookingItem[]>;
  findByBookingId(bookingId: string): Promise<IBookingItem[]>;
  deleteByBookingId(bookingId: string): Promise<void>;
}

export interface IEquipmentService {
  checkAvailability(
    tenantId: string,
    equipmentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ available: boolean; conflictingBookings: string[] }>;
  getEquipmentById(id: string): Promise<{ id: string; code: string; name: string; dailyRate: number } | null>;
}

export interface INotificationService {
  sendBookingCreated(booking: IBooking, items: IBookingItem[]): Promise<void>;
  sendBookingReminder(booking: IBooking): Promise<void>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

/** Booking expiration time in hours */
const BOOKING_EXPIRATION_HOURS = 24;

@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly itemRepository: IBookingItemRepository,
    private readonly equipmentService: IEquipmentService,
    private readonly notificationService: INotificationService,
    private readonly auditService: IAuditService,
  ) {}

  async createBooking(
    input: CreateBookingDto,
    tenantId: string,
  ): Promise<{ booking: IBooking; items: IBookingItem[] }> {
    const validationResult = CreateBookingSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Validate dates
    if (validInput.endDate && validInput.endDate <= validInput.startDate) {
      throw new Error('End date must be after start date');
    }

    // Check availability for all equipment
    for (const item of validInput.items) {
      if (item.equipmentId) {
        const availability = await this.equipmentService.checkAvailability(
          tenantId,
          item.equipmentId,
          validInput.startDate,
          validInput.endDate || validInput.startDate,
        );
        if (!availability.available) {
          throw new Error(`Equipment ${item.equipmentName} is not available for the selected dates`);
        }
      }
    }

    // Generate booking number and confirmation token
    const year = new Date().getFullYear();
    const sequence = await this.bookingRepository.getNextSequence(tenantId, year);
    const bookingNumber = `FOG-${year}-${String(sequence).padStart(5, '0')}`;
    const confirmationToken = randomBytes(32).toString('hex');

    // Calculate totals
    const endDate = validInput.endDate || validInput.startDate;
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - validInput.startDate.getTime()) / (1000 * 60 * 60 * 24)));

    let totalAmount = 0;
    const itemsToCreate: Partial<IBookingItem>[] = validInput.items.map((item) => {
      const itemTotal = item.dailyRate * item.quantity * totalDays;
      totalAmount += itemTotal;
      return {
        tenantId,
        equipmentId: item.equipmentId,
        equipmentCode: item.equipmentCode,
        equipmentName: item.equipmentName,
        quantity: item.quantity,
        dailyRate: item.dailyRate,
        totalDays,
        itemTotal,
      };
    });

    // Set expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + BOOKING_EXPIRATION_HOURS);

    const booking = await this.bookingRepository.create({
      tenantId,
      bookingNumber,
      type: validInput.type as BookingType,
      status: BookingStatus.PENDING,
      customerName: validInput.customerName,
      customerEmail: validInput.customerEmail,
      customerPhone: validInput.customerPhone,
      startDate: validInput.startDate,
      endDate: validInput.endDate,
      notes: validInput.notes,
      totalAmount,
      depositAmount: validInput.depositAmount,
      paymentStatus: PaymentStatus.PENDING,
      confirmationToken,
      expiresAt,
    });

    // Create booking items
    const itemsWithBookingId = itemsToCreate.map((item) => ({
      ...item,
      bookingId: booking.id,
    }));
    const items = await this.itemRepository.createMany(itemsWithBookingId);

    // Send notification
    await this.notificationService.sendBookingCreated(booking, items);

    await this.auditService.log({
      action: 'booking_created',
      entityType: 'booking',
      entityId: booking.id,
      userId: 'online', // Public booking
      tenantId,
      metadata: {
        bookingNumber,
        customerEmail: validInput.customerEmail,
        totalAmount,
        itemCount: items.length,
      },
    });

    return { booking, items };
  }

  async checkAvailability(
    input: CheckAvailabilityDto,
    tenantId: string,
  ): Promise<IAvailabilityCheck[]> {
    const validationResult = CheckAvailabilitySchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const results: IAvailabilityCheck[] = [];

    for (const equipmentId of validInput.equipmentIds) {
      const availability = await this.equipmentService.checkAvailability(
        tenantId,
        equipmentId,
        validInput.startDate,
        validInput.endDate,
      );

      results.push({
        equipmentId,
        startDate: validInput.startDate,
        endDate: validInput.endDate,
        available: availability.available,
        conflictingBookings: availability.conflictingBookings,
      });
    }

    return results;
  }

  async getTimeSlots(
    input: GetTimeSlotsDto,
    tenantId: string,
  ): Promise<ITimeSlot[]> {
    const validationResult = GetTimeSlotsSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const slots: ITimeSlot[] = [];

    // Generate time slots for the day (business hours: 8:00 - 18:00)
    const startHour = 8;
    const endHour = 18;
    const slotDuration = validInput.type === 'SERVICE' ? 1 : 2; // 1 hour for service, 2 for rental

    // Get existing bookings for the date
    const dayStart = new Date(validInput.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(validInput.date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingBookings = await this.bookingRepository.findByDateRange(
      tenantId,
      dayStart,
      dayEnd,
    );

    const bookedCount = existingBookings.filter(
      (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING,
    ).length;

    for (let hour = startHour; hour < endHour; hour += slotDuration) {
      const slotStart = `${String(hour).padStart(2, '0')}:00`;
      const slotEnd = `${String(hour + slotDuration).padStart(2, '0')}:00`;

      slots.push({
        date: validInput.date,
        startTime: slotStart,
        endTime: slotEnd,
        available: bookedCount < 10, // Max 10 bookings per day
        capacity: 10,
        booked: bookedCount,
      });
    }

    return slots;
  }

  async getBookingByNumber(
    bookingNumber: string,
    tenantId: string,
  ): Promise<{ booking: IBooking; items: IBookingItem[] }> {
    const booking = await this.bookingRepository.findByBookingNumber(bookingNumber);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const items = await this.itemRepository.findByBookingId(booking.id);
    return { booking, items };
  }

  async expirePendingBookings(): Promise<number> {
    const now = new Date();
    const expiredBookings = await this.bookingRepository.findPendingExpired(now);

    let expiredCount = 0;
    for (const booking of expiredBookings) {
      await this.bookingRepository.update(booking.id, {
        status: BookingStatus.EXPIRED,
      });

      await this.auditService.log({
        action: 'booking_expired',
        entityType: 'booking',
        entityId: booking.id,
        userId: 'system',
        tenantId: booking.tenantId,
        metadata: {
          bookingNumber: booking.bookingNumber,
          customerEmail: booking.customerEmail,
          expiresAt: booking.expiresAt,
        },
      });

      expiredCount++;
    }

    return expiredCount;
  }
}
