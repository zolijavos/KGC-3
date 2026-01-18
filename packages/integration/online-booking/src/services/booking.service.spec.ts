import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BookingService,
  IBookingRepository,
  IBookingItemRepository,
  IEquipmentService,
  INotificationService,
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

const mockEquipmentService: IEquipmentService = {
  checkAvailability: vi.fn(),
  getEquipmentById: vi.fn(),
};

const mockNotificationService: INotificationService = {
  sendBookingCreated: vi.fn(),
  sendBookingReminder: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('BookingService', () => {
  let service: BookingService;

  const mockTenantId = 'tenant-1';
  const mockEquipmentId = '00000000-0000-0000-0000-000000000001';

  const mockBooking: IBooking = {
    id: '00000000-0000-0000-0000-000000000002',
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
    confirmationToken: 'token123',
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBookingItem: IBookingItem = {
    id: '00000000-0000-0000-0000-000000000003',
    bookingId: mockBooking.id,
    tenantId: mockTenantId,
    equipmentId: mockEquipmentId,
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
    service = new BookingService(
      mockBookingRepository,
      mockItemRepository,
      mockEquipmentService,
      mockNotificationService,
      mockAuditService,
    );
  });

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      (mockEquipmentService.checkAvailability as ReturnType<typeof vi.fn>).mockResolvedValue({
        available: true,
        conflictingBookings: [],
      });
      (mockBookingRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(1);
      (mockBookingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);
      (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockBookingItem]);

      const result = await service.createBooking(
        {
          customerName: 'Kovács János',
          customerEmail: 'janos@example.com',
          customerPhone: '+36301234567',
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
          items: [
            {
              equipmentId: mockEquipmentId,
              equipmentName: 'Makita Fúrógép',
              dailyRate: 10000,
            },
          ],
          depositAmount: 10000,
        },
        mockTenantId,
      );

      expect(result.booking).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(mockNotificationService.sendBookingCreated).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'booking_created' }),
      );
    });

    it('should throw error when equipment not available', async () => {
      (mockEquipmentService.checkAvailability as ReturnType<typeof vi.fn>).mockResolvedValue({
        available: false,
        conflictingBookings: ['FOG-2026-00001'],
      });

      await expect(
        service.createBooking(
          {
            customerName: 'Kovács János',
            customerEmail: 'janos@example.com',
            customerPhone: '+36301234567',
            startDate: new Date('2026-02-01'),
            items: [
              {
                equipmentId: mockEquipmentId,
                equipmentName: 'Makita Fúrógép',
                dailyRate: 10000,
              },
            ],
          },
          mockTenantId,
        ),
      ).rejects.toThrow('is not available');
    });

    it('should throw error when end date is before start date', async () => {
      await expect(
        service.createBooking(
          {
            customerName: 'Kovács János',
            customerEmail: 'janos@example.com',
            customerPhone: '+36301234567',
            startDate: new Date('2026-02-05'),
            endDate: new Date('2026-02-01'),
            items: [{ equipmentName: 'Test', dailyRate: 1000 }],
          },
          mockTenantId,
        ),
      ).rejects.toThrow('End date must be after start date');
    });

    it('should create booking without equipment check when no equipmentId', async () => {
      (mockBookingRepository.getNextSequence as ReturnType<typeof vi.fn>).mockResolvedValue(2);
      (mockBookingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);
      (mockItemRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockBookingItem]);

      const result = await service.createBooking(
        {
          type: 'SERVICE',
          customerName: 'Kovács János',
          customerEmail: 'janos@example.com',
          customerPhone: '+36301234567',
          startDate: new Date('2026-02-01'),
          items: [{ equipmentName: 'Szerviz szolgáltatás', dailyRate: 5000 }],
        },
        mockTenantId,
      );

      expect(result.booking).toBeDefined();
      expect(mockEquipmentService.checkAvailability).not.toHaveBeenCalled();
    });
  });

  describe('checkAvailability', () => {
    it('should check availability for multiple equipment', async () => {
      (mockEquipmentService.checkAvailability as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ available: true, conflictingBookings: [] })
        .mockResolvedValueOnce({ available: false, conflictingBookings: ['FOG-001'] });

      const equipmentId2 = '00000000-0000-0000-0000-000000000010';
      const result = await service.checkAvailability(
        {
          equipmentIds: [mockEquipmentId, equipmentId2],
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-03'),
        },
        mockTenantId,
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.available).toBe(true);
      expect(result[1]?.available).toBe(false);
    });
  });

  describe('getTimeSlots', () => {
    it('should return time slots for a day', async () => {
      (mockBookingRepository.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getTimeSlots(
        { date: new Date('2026-02-01'), type: 'RENTAL' },
        mockTenantId,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.available).toBe(true);
    });

    it('should show reduced availability when bookings exist', async () => {
      const confirmedBookings = Array(8).fill({ ...mockBooking, status: BookingStatus.CONFIRMED });
      (mockBookingRepository.findByDateRange as ReturnType<typeof vi.fn>).mockResolvedValue(confirmedBookings);

      const result = await service.getTimeSlots(
        { date: new Date('2026-02-01'), type: 'RENTAL' },
        mockTenantId,
      );

      expect(result[0]?.booked).toBe(8);
      expect(result[0]?.available).toBe(true); // Still under 10
    });
  });

  describe('getBookingByNumber', () => {
    it('should return booking with items', async () => {
      (mockBookingRepository.findByBookingNumber as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);
      (mockItemRepository.findByBookingId as ReturnType<typeof vi.fn>).mockResolvedValue([mockBookingItem]);

      const result = await service.getBookingByNumber('FOG-2026-00001', mockTenantId);

      expect(result.booking.bookingNumber).toBe('FOG-2026-00001');
      expect(result.items).toHaveLength(1);
    });

    it('should throw error when booking not found', async () => {
      (mockBookingRepository.findByBookingNumber as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getBookingByNumber('FOG-9999-99999', mockTenantId),
      ).rejects.toThrow('Booking not found');
    });

    it('should throw error on tenant mismatch', async () => {
      (mockBookingRepository.findByBookingNumber as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);

      await expect(
        service.getBookingByNumber('FOG-2026-00001', 'other-tenant'),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('expirePendingBookings', () => {
    it('should expire pending bookings past expiration', async () => {
      const expiredBookings = [mockBooking, { ...mockBooking, id: 'booking-2' }];
      (mockBookingRepository.findPendingExpired as ReturnType<typeof vi.fn>).mockResolvedValue(expiredBookings);
      (mockBookingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockBooking);

      const count = await service.expirePendingBookings();

      expect(count).toBe(2);
      expect(mockBookingRepository.update).toHaveBeenCalledTimes(2);
      expect(mockAuditService.log).toHaveBeenCalledTimes(2);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'booking_expired' }),
      );
    });
  });
});
