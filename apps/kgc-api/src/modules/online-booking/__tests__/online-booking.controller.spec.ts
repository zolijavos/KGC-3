/**
 * Online Booking Controller Tests
 * Epic 26: Online Booking
 *
 * Tests for online booking API endpoints
 */

import {
  BookingStatus,
  BookingType,
  IAvailabilityCheck,
  IBooking,
  IBookingConfirmation,
  IBookingItem,
  ITimeSlot,
  PaymentStatus,
} from '@kgc/online-booking';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnlineBookingController } from '../controllers/online-booking.controller';

// ============================================
// Mock Services
// ============================================

const mockBookingService = {
  createBooking: vi.fn(),
  checkAvailability: vi.fn(),
  getTimeSlots: vi.fn(),
  getBookingByNumber: vi.fn(),
};

const mockConfirmationService = {
  confirmBooking: vi.fn(),
  cancelBooking: vi.fn(),
  getBookingStatus: vi.fn(),
  resendConfirmation: vi.fn(),
};

// ============================================
// Test Data
// ============================================

const testTenantId = 'tenant-001';
const testUserId = 'user-001';
const testBookingId = '00000000-0000-0000-0000-000000000001';
const testEquipmentId = '00000000-0000-0000-0000-000000000002';
const testToken = 'test-confirmation-token-abc123';

const mockBooking: IBooking = {
  id: testBookingId,
  tenantId: testTenantId,
  bookingNumber: 'FOG-2026-00001',
  type: BookingType.RENTAL,
  status: BookingStatus.PENDING,
  customerName: 'Teszt Béla',
  customerEmail: 'test@example.com',
  customerPhone: '+36301234567',
  startDate: new Date('2026-02-01'),
  endDate: new Date('2026-02-03'),
  totalAmount: 50000,
  paymentStatus: PaymentStatus.PENDING,
  confirmationToken: testToken,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBookingItem: IBookingItem = {
  id: '00000000-0000-0000-0000-000000000003',
  tenantId: testTenantId,
  bookingId: testBookingId,
  equipmentId: testEquipmentId,
  equipmentCode: 'BG-001',
  equipmentName: 'Makita fúrógép',
  quantity: 1,
  dailyRate: 5000,
  totalDays: 3,
  itemTotal: 15000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTimeSlot: ITimeSlot = {
  date: new Date('2026-02-01'),
  startTime: '08:00',
  endTime: '10:00',
  available: true,
  capacity: 10,
  booked: 2,
};

const mockAvailability: IAvailabilityCheck = {
  equipmentId: testEquipmentId,
  startDate: new Date('2026-02-01'),
  endDate: new Date('2026-02-03'),
  available: true,
  conflictingBookings: [],
};

const mockConfirmation: IBookingConfirmation = {
  bookingId: testBookingId,
  bookingNumber: 'FOG-2026-00001',
  status: BookingStatus.CONFIRMED,
  paymentStatus: PaymentStatus.PAID,
  confirmedAt: new Date(),
};

// ============================================
// Test Suite
// ============================================

describe('OnlineBookingController', () => {
  let controller: OnlineBookingController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new OnlineBookingController(
      mockBookingService as any,
      mockConfirmationService as any
    );
  });

  // ============================================
  // POST /bookings
  // ============================================

  describe('POST /bookings', () => {
    const createInput = {
      type: 'RENTAL' as const,
      customerName: 'Teszt Béla',
      customerEmail: 'test@example.com',
      customerPhone: '+36301234567',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-03'),
      items: [
        {
          equipmentId: testEquipmentId,
          equipmentCode: 'BG-001',
          equipmentName: 'Makita fúrógép',
          quantity: 1,
          dailyRate: 5000,
        },
      ],
    };

    it('should create a new booking', async () => {
      mockBookingService.createBooking.mockResolvedValue({
        booking: mockBooking,
        items: [mockBookingItem],
      });

      const result = await controller.createBooking(createInput, testTenantId);

      expect(mockBookingService.createBooking).toHaveBeenCalledWith(createInput, testTenantId);
      expect(result.booking.bookingNumber).toBe('FOG-2026-00001');
      expect(result.items).toHaveLength(1);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.createBooking(createInput, '')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when equipment not available', async () => {
      mockBookingService.createBooking.mockRejectedValue(
        new Error('Equipment Makita fúrógép is not available for the selected dates')
      );

      await expect(controller.createBooking(createInput, testTenantId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException on validation failure', async () => {
      mockBookingService.createBooking.mockRejectedValue(
        new Error('Validation failed: customerEmail is required')
      );

      await expect(controller.createBooking(createInput, testTenantId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when end date before start date', async () => {
      mockBookingService.createBooking.mockRejectedValue(
        new Error('End date must be after start date')
      );

      await expect(controller.createBooking(createInput, testTenantId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ============================================
  // POST /bookings/check-availability
  // ============================================

  describe('POST /bookings/check-availability', () => {
    const checkInput = {
      equipmentIds: [testEquipmentId],
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-03'),
    };

    it('should check availability', async () => {
      mockBookingService.checkAvailability.mockResolvedValue([mockAvailability]);

      const result = await controller.checkAvailability(checkInput, testTenantId);

      expect(mockBookingService.checkAvailability).toHaveBeenCalledWith(checkInput, testTenantId);
      expect(result).toHaveLength(1);
      expect(result[0]?.available).toBe(true);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.checkAvailability(checkInput, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException on validation failure', async () => {
      mockBookingService.checkAvailability.mockRejectedValue(
        new Error('Validation failed: equipmentIds is required')
      );

      await expect(controller.checkAvailability(checkInput, testTenantId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ============================================
  // GET /bookings/time-slots
  // ============================================

  describe('GET /bookings/time-slots', () => {
    it('should return time slots for rental', async () => {
      mockBookingService.getTimeSlots.mockResolvedValue([mockTimeSlot]);

      const result = await controller.getTimeSlots(testTenantId, '2026-02-01', 'RENTAL');

      expect(mockBookingService.getTimeSlots).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]?.available).toBe(true);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getTimeSlots('', '2026-02-01')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException without date', async () => {
      await expect(controller.getTimeSlots(testTenantId, '')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on validation failure', async () => {
      mockBookingService.getTimeSlots.mockRejectedValue(
        new Error('Validation failed: Invalid date format')
      );

      await expect(controller.getTimeSlots(testTenantId, 'invalid-date')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ============================================
  // GET /bookings/:bookingNumber
  // ============================================

  describe('GET /bookings/:bookingNumber', () => {
    it('should return booking by number', async () => {
      mockBookingService.getBookingByNumber.mockResolvedValue({
        booking: mockBooking,
        items: [mockBookingItem],
      });

      const result = await controller.getBookingByNumber('FOG-2026-00001', testTenantId);

      expect(mockBookingService.getBookingByNumber).toHaveBeenCalledWith(
        'FOG-2026-00001',
        testTenantId
      );
      expect(result.booking.customerName).toBe('Teszt Béla');
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getBookingByNumber('FOG-2026-00001', '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockBookingService.getBookingByNumber.mockRejectedValue(new Error('Booking not found'));

      await expect(controller.getBookingByNumber('FOG-INVALID', testTenantId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockBookingService.getBookingByNumber.mockRejectedValue(new Error('Access denied'));

      await expect(controller.getBookingByNumber('FOG-2026-00001', 'other-tenant')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ============================================
  // POST /bookings/confirm
  // ============================================

  describe('POST /bookings/confirm', () => {
    const confirmInput = {
      confirmationToken: testToken,
      paymentMethod: 'CARD' as const,
    };

    it('should confirm booking', async () => {
      mockConfirmationService.confirmBooking.mockResolvedValue(mockConfirmation);

      const result = await controller.confirmBooking(confirmInput, testTenantId);

      expect(mockConfirmationService.confirmBooking).toHaveBeenCalledWith(
        confirmInput,
        testTenantId
      );
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.confirmBooking(confirmInput, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException on invalid token', async () => {
      mockConfirmationService.confirmBooking.mockRejectedValue(
        new Error('Invalid confirmation token')
      );

      await expect(controller.confirmBooking(confirmInput, testTenantId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when booking expired', async () => {
      mockConfirmationService.confirmBooking.mockRejectedValue(new Error('Booking has expired'));

      await expect(controller.confirmBooking(confirmInput, testTenantId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when payment failed', async () => {
      mockConfirmationService.confirmBooking.mockRejectedValue(
        new Error('Payment failed: Insufficient funds')
      );

      await expect(controller.confirmBooking(confirmInput, testTenantId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when booking cannot be confirmed', async () => {
      mockConfirmationService.confirmBooking.mockRejectedValue(
        new Error('Booking cannot be confirmed')
      );

      await expect(controller.confirmBooking(confirmInput, testTenantId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // ============================================
  // POST /bookings/:id/cancel
  // ============================================

  describe('POST /bookings/:id/cancel', () => {
    const cancelInput = {
      reason: 'Ügyél lemondta',
    };

    it('should cancel booking', async () => {
      const cancelledBooking = { ...mockBooking, status: BookingStatus.CANCELLED };
      mockConfirmationService.cancelBooking.mockResolvedValue(cancelledBooking);

      const result = await controller.cancelBooking(
        testBookingId,
        cancelInput,
        testTenantId,
        testUserId
      );

      expect(mockConfirmationService.cancelBooking).toHaveBeenCalledWith(
        testBookingId,
        cancelInput,
        testTenantId,
        testUserId
      );
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(
        controller.cancelBooking(testBookingId, cancelInput, '', testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(
        controller.cancelBooking(testBookingId, cancelInput, testTenantId, '')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockConfirmationService.cancelBooking.mockRejectedValue(new Error('Booking not found'));

      await expect(
        controller.cancelBooking('invalid-id', cancelInput, testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockConfirmationService.cancelBooking.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.cancelBooking(testBookingId, cancelInput, 'other-tenant', testUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when already cancelled', async () => {
      mockConfirmationService.cancelBooking.mockRejectedValue(
        new Error('Booking is already cancelled')
      );

      await expect(
        controller.cancelBooking(testBookingId, cancelInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cannot cancel', async () => {
      mockConfirmationService.cancelBooking.mockRejectedValue(
        new Error('Cannot cancel completed booking')
      );

      await expect(
        controller.cancelBooking(testBookingId, cancelInput, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================
  // GET /bookings/status/:token
  // ============================================

  describe('GET /bookings/status/:token', () => {
    it('should return booking status by token', async () => {
      mockConfirmationService.getBookingStatus.mockResolvedValue({
        booking: mockBooking,
        items: [mockBookingItem],
      });

      const result = await controller.getBookingStatus(testToken, testTenantId);

      expect(mockConfirmationService.getBookingStatus).toHaveBeenCalledWith(
        testToken,
        testTenantId
      );
      expect(result.booking.status).toBe(BookingStatus.PENDING);
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.getBookingStatus(testToken, '')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockConfirmationService.getBookingStatus.mockRejectedValue(new Error('Booking not found'));

      await expect(controller.getBookingStatus('invalid-token', testTenantId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockConfirmationService.getBookingStatus.mockRejectedValue(new Error('Access denied'));

      await expect(controller.getBookingStatus(testToken, 'other-tenant')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  // ============================================
  // POST /bookings/:id/resend-confirmation
  // ============================================

  describe('POST /bookings/:id/resend-confirmation', () => {
    it('should resend confirmation email', async () => {
      mockConfirmationService.resendConfirmation.mockResolvedValue(undefined);

      await expect(
        controller.resendConfirmation(testBookingId, testTenantId, testUserId)
      ).resolves.toBeUndefined();

      expect(mockConfirmationService.resendConfirmation).toHaveBeenCalledWith(
        testBookingId,
        testTenantId,
        testUserId
      );
    });

    it('should throw BadRequestException without tenantId', async () => {
      await expect(controller.resendConfirmation(testBookingId, '', testUserId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException without userId', async () => {
      await expect(controller.resendConfirmation(testBookingId, testTenantId, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockConfirmationService.resendConfirmation.mockRejectedValue(new Error('Booking not found'));

      await expect(
        controller.resendConfirmation('invalid-id', testTenantId, testUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException on access denied', async () => {
      mockConfirmationService.resendConfirmation.mockRejectedValue(new Error('Access denied'));

      await expect(
        controller.resendConfirmation(testBookingId, 'other-tenant', testUserId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when booking not pending', async () => {
      mockConfirmationService.resendConfirmation.mockRejectedValue(
        new Error('Can only resend confirmation for pending bookings')
      );

      await expect(
        controller.resendConfirmation(testBookingId, testTenantId, testUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
