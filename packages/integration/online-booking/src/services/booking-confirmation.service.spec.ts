import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BookingConfirmationService,
  IPaymentService,
  IRentalService,
  INotificationService,
} from './booking-confirmation.service';
import {
  IBookingRepository,
  IBookingItemRepository,
  IAuditService,
} from './booking.service';
import {
  IBooking,
  IBookingItem,
  BookingStatus,
  BookingType,
  PaymentStatus,
} from '../interfaces/booking.interface';

const mockBookingRepository: IBookingRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByBookingNumber: vi.fn(),
  findByConfirmationToken: vi.fn(),
  findByDateRange: vi.fn(),
  findPendingExpired: vi.fn(),
  update: vi.fn(),
  getNextSequence: vi.fn(),
};

const mockItemRepository: IBookingItemRepository = {
  createMany: vi.fn(),
  findByBookingId: vi.fn(),
  deleteByBookingId: vi.fn(),
};

const mockPaymentService: IPaymentService = {
  processDeposit: vi.fn(),
  refundDeposit: vi.fn(),
};

const mockRentalService: IRentalService = {
  createReservation: vi.fn(),
  cancelReservation: vi.fn(),
};

const mockNotificationService: INotificationService = {
  sendBookingConfirmed: vi.fn(),
  sendBookingCancelled: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('BookingConfirmationService', () => {
  let service: BookingConfirmationService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';

  const mockBooking: IBooking = {
    id: '00000000-0000-0000-0000-000000000001',
    tenantId: mockTenantId,
    bookingNumber: 'FOG-2026-00001',
    type: BookingType.RENTAL,
    status: BookingStatus.PENDING,
    customerName: 'Kovács János',
    customerEmail: 'janos@example.com',
    customerPhone: '+36301234567',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-03'),
    totalAmount: 30000,
    depositAmount: 10000,
    paymentStatus: PaymentStatus.PENDING,
    confirmationToken: 'valid-token-123',
    expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBookingItem: IBookingItem = {
    id: '00000000-0000-0000-0000-000000000002',
    bookingId: mockBooking.id,
    tenantId: mockTenantId,
    equipmentId: '00000000-0000-0000-0000-000000000003',
    equipmentCode: 'BG-001',
    equipmentName: 'Makita Fúrógép',
    quantity: 1,
    dailyRate: 10000,
    totalDays: 3,
    itemTotal: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BookingConfirmationService(
      mockBookingRepository,
      mockItemRepository,
      mockPaymentService,
      mockRentalService,
      mockNotificationService,
      mockAuditService,
    );
  });

  describe('confirmBooking', () => {
    it('should confirm booking with payment', async () => {
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);
      (mockPaymentService.processDeposit as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
      });
      (mockItemRepository.findByBookingId as ReturnType<typeof vi.fn>).mockResolvedValue([mockBookingItem]);
      (mockRentalService.createReservation as ReturnType<typeof vi.fn>).mockResolvedValue({
        reservationId: 'res-123',
      });
      (mockBookingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
      });

      const result = await service.confirmBooking(
        { confirmationToken: 'valid-token-123' },
        mockTenantId,
      );

      expect(result.bookingNumber).toBe('FOG-2026-00001');
      expect(result.confirmedAt).toBeDefined();
      expect(mockPaymentService.processDeposit).toHaveBeenCalledWith(
        mockBooking.id,
        10000,
        undefined,
      );
      expect(mockRentalService.createReservation).toHaveBeenCalled();
      expect(mockNotificationService.sendBookingConfirmed).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'booking_confirmed' }),
      );
    });

    it('should confirm booking without deposit', async () => {
      const bookingWithoutDeposit = { ...mockBooking, depositAmount: 0 };
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(bookingWithoutDeposit);
      (mockItemRepository.findByBookingId as ReturnType<typeof vi.fn>).mockResolvedValue([mockBookingItem]);
      (mockRentalService.createReservation as ReturnType<typeof vi.fn>).mockResolvedValue({
        reservationId: 'res-123',
      });
      (mockBookingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...bookingWithoutDeposit,
        status: BookingStatus.CONFIRMED,
      });

      await service.confirmBooking(
        { confirmationToken: 'valid-token-123' },
        mockTenantId,
      );

      expect(mockPaymentService.processDeposit).not.toHaveBeenCalled();
    });

    it('should throw error when token is invalid', async () => {
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.confirmBooking(
          { confirmationToken: 'invalid-token' },
          mockTenantId,
        ),
      ).rejects.toThrow('Invalid confirmation token');
    });

    it('should throw error when booking is expired', async () => {
      const expiredBooking = {
        ...mockBooking,
        expiresAt: new Date(Date.now() - 86400000), // 24 hours ago
      };
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(expiredBooking);
      (mockBookingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...expiredBooking,
        status: BookingStatus.EXPIRED,
      });

      await expect(
        service.confirmBooking(
          { confirmationToken: 'valid-token-123' },
          mockTenantId,
        ),
      ).rejects.toThrow('Booking has expired');
    });

    it('should throw error when booking already confirmed', async () => {
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED };
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(confirmedBooking);

      await expect(
        service.confirmBooking(
          { confirmationToken: 'valid-token-123' },
          mockTenantId,
        ),
      ).rejects.toThrow('Booking cannot be confirmed');
    });

    it('should throw error when payment fails', async () => {
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);
      (mockPaymentService.processDeposit as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Card declined',
      });

      await expect(
        service.confirmBooking(
          { confirmationToken: 'valid-token-123' },
          mockTenantId,
        ),
      ).rejects.toThrow('Payment failed: Card declined');
    });

    it('should throw error on tenant mismatch', async () => {
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);

      await expect(
        service.confirmBooking(
          { confirmationToken: 'valid-token-123' },
          'other-tenant',
        ),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel pending booking', async () => {
      (mockBookingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);
      (mockBookingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      });

      const result = await service.cancelBooking(
        mockBooking.id,
        { reason: 'Nem tudom átvenni' },
        mockTenantId,
        mockUserId,
      );

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockNotificationService.sendBookingCancelled).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'booking_cancelled' }),
      );
    });

    it('should process refund when cancelling paid booking', async () => {
      const paidBooking = { ...mockBooking, paymentStatus: PaymentStatus.PAID };
      (mockBookingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(paidBooking);
      (mockBookingRepository.update as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ...paidBooking, paymentStatus: PaymentStatus.REFUNDED })
        .mockResolvedValueOnce({ ...paidBooking, status: BookingStatus.CANCELLED });

      await service.cancelBooking(
        mockBooking.id,
        { reason: 'Változott a tervem' },
        mockTenantId,
        mockUserId,
      );

      expect(mockBookingRepository.update).toHaveBeenCalledWith(
        mockBooking.id,
        expect.objectContaining({ paymentStatus: PaymentStatus.REFUNDED }),
      );
    });

    it('should not allow cancelling completed booking', async () => {
      const completedBooking = { ...mockBooking, status: BookingStatus.COMPLETED };
      (mockBookingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(completedBooking);

      await expect(
        service.cancelBooking(
          mockBooking.id,
          { reason: 'Test' },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Cannot cancel completed booking');
    });

    it('should not allow cancelling already cancelled booking', async () => {
      const cancelledBooking = { ...mockBooking, status: BookingStatus.CANCELLED };
      (mockBookingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(cancelledBooking);

      await expect(
        service.cancelBooking(
          mockBooking.id,
          { reason: 'Test' },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Booking is already cancelled');
    });
  });

  describe('getBookingStatus', () => {
    it('should return booking with items by token', async () => {
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);
      (mockItemRepository.findByBookingId as ReturnType<typeof vi.fn>).mockResolvedValue([mockBookingItem]);

      const result = await service.getBookingStatus('valid-token-123', mockTenantId);

      expect(result.booking.bookingNumber).toBe('FOG-2026-00001');
      expect(result.items).toHaveLength(1);
    });

    it('should throw error when booking not found', async () => {
      (mockBookingRepository.findByConfirmationToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getBookingStatus('invalid-token', mockTenantId),
      ).rejects.toThrow('Booking not found');
    });
  });

  describe('resendConfirmation', () => {
    it('should resend confirmation and extend expiration', async () => {
      (mockBookingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);
      (mockItemRepository.findByBookingId as ReturnType<typeof vi.fn>).mockResolvedValue([mockBookingItem]);
      (mockBookingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);

      await service.resendConfirmation(mockBooking.id, mockTenantId, mockUserId);

      expect(mockBookingRepository.update).toHaveBeenCalledWith(
        mockBooking.id,
        expect.objectContaining({ expiresAt: expect.any(Date) }),
      );
      expect(mockNotificationService.sendBookingConfirmed).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'booking_confirmation_resent' }),
      );
    });

    it('should not resend for non-pending booking', async () => {
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED };
      (mockBookingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(confirmedBooking);

      await expect(
        service.resendConfirmation(mockBooking.id, mockTenantId, mockUserId),
      ).rejects.toThrow('Can only resend confirmation for pending bookings');
    });
  });
});
