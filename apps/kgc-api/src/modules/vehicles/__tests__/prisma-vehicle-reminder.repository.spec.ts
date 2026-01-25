/**
 * Unit Tests: PrismaVehicleReminderRepository
 * Epic 34: Járműnyilvántartás (ADR-027)
 *
 * TDD/Unit tesztek a dokumentum lejárat emlékeztető repository-hoz
 * Prioritás: P1 (High - automatikus emlékeztetők)
 */

import { NotificationType, VehicleDocumentType } from '@kgc/vehicles';
import { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaVehicleReminderRepository } from '../repositories/prisma-vehicle-reminder.repository';

// Mock Prisma Client
const mockPrisma = {
  vehicleDocumentReminder: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe('PrismaVehicleReminderRepository', () => {
  let repository: PrismaVehicleReminderRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaVehicleReminderRepository(mockPrisma);
  });

  describe('findByVehicle()', () => {
    it('[P1] should find reminders for rental vehicle', async () => {
      // GIVEN: Reminders exist for rental vehicle
      const mockReminders = [
        {
          id: 'rem-1',
          rentalVehicleId: 'rv-123',
          companyVehicleId: null,
          documentType: 'KGFB_INSURANCE',
          expiryDate: new Date('2025-06-30'),
          reminderDaysBefore: 30,
          notificationSentAt: null,
          notificationType: null,
          sentToUserIds: [],
          createdAt: new Date(),
        },
      ];
      vi.mocked(mockPrisma.vehicleDocumentReminder.findMany).mockResolvedValue(
        mockReminders as never
      );

      // WHEN: Finding reminders for rental vehicle
      const result = await repository.findByVehicle('rental', 'rv-123');

      // THEN: Returns reminders
      expect(mockPrisma.vehicleDocumentReminder.findMany).toHaveBeenCalledWith({
        where: { rentalVehicleId: 'rv-123' },
        orderBy: { expiryDate: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.documentType).toBe('KGFB_INSURANCE');
    });

    it('[P1] should find reminders for company vehicle', async () => {
      // GIVEN: Reminders exist for company vehicle
      vi.mocked(mockPrisma.vehicleDocumentReminder.findMany).mockResolvedValue([]);

      // WHEN: Finding reminders for company vehicle
      await repository.findByVehicle('company', 'cv-456');

      // THEN: Query uses companyVehicleId
      expect(mockPrisma.vehicleDocumentReminder.findMany).toHaveBeenCalledWith({
        where: { companyVehicleId: 'cv-456' },
        orderBy: { expiryDate: 'asc' },
      });
    });
  });

  describe('findPendingReminders()', () => {
    it('[P1] should find unsent reminders due for sending', async () => {
      // GIVEN: Pending reminders exist
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 30);

      const mockReminders = [
        {
          id: 'rem-pending',
          rentalVehicleId: 'rv-123',
          companyVehicleId: null,
          documentType: 'KGFB_INSURANCE',
          expiryDate: targetDate,
          reminderDaysBefore: 30,
          notificationSentAt: null,
          notificationType: null,
          sentToUserIds: [],
          createdAt: new Date(),
        },
      ];
      vi.mocked(mockPrisma.vehicleDocumentReminder.findMany).mockResolvedValue(
        mockReminders as never
      );

      // WHEN: Finding pending reminders
      const result = await repository.findPendingReminders(VehicleDocumentType.KGFB_INSURANCE, 30);

      // THEN: Returns pending reminders
      expect(mockPrisma.vehicleDocumentReminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            documentType: 'KGFB_INSURANCE',
            reminderDaysBefore: 30,
            notificationSentAt: null,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('create()', () => {
    it('[P1] should create reminder for rental vehicle', async () => {
      // GIVEN: Valid reminder input
      const input = {
        rentalVehicleId: 'rv-123',
        documentType: VehicleDocumentType.KGFB_INSURANCE,
        expiryDate: new Date('2025-06-30'),
        reminderDaysBefore: 30,
      };
      const mockCreated = {
        id: 'rem-new',
        ...input,
        documentType: 'KGFB_INSURANCE',
        companyVehicleId: null,
        notificationSentAt: null,
        notificationType: null,
        sentToUserIds: [],
        createdAt: new Date(),
      };
      vi.mocked(mockPrisma.vehicleDocumentReminder.create).mockResolvedValue(mockCreated as never);

      // WHEN: Creating reminder
      const result = await repository.create(input);

      // THEN: Reminder is created
      expect(mockPrisma.vehicleDocumentReminder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rentalVehicleId: 'rv-123',
          companyVehicleId: null,
          documentType: 'KGFB_INSURANCE',
          reminderDaysBefore: 30,
        }),
      });
      expect(result.id).toBe('rem-new');
    });

    it('[P1] should create reminder for company vehicle', async () => {
      // GIVEN: Valid input for company vehicle
      const input = {
        companyVehicleId: 'cv-456',
        documentType: VehicleDocumentType.CASCO_INSURANCE,
        expiryDate: new Date('2025-09-01'),
        reminderDaysBefore: 14,
      };
      const mockCreated = {
        id: 'rem-company',
        rentalVehicleId: null,
        ...input,
        documentType: 'CASCO_INSURANCE',
        notificationSentAt: null,
        notificationType: null,
        sentToUserIds: [],
        createdAt: new Date(),
      };
      vi.mocked(mockPrisma.vehicleDocumentReminder.create).mockResolvedValue(mockCreated as never);

      // WHEN: Creating reminder
      const result = await repository.create(input);

      // THEN: Reminder is created for company vehicle
      expect(result.companyVehicleId).toBe('cv-456');
    });

    it('[P1] should throw error if no vehicle specified', async () => {
      // GIVEN: Input without vehicle ID
      const input = {
        documentType: VehicleDocumentType.KGFB_INSURANCE,
        expiryDate: new Date('2025-06-30'),
        reminderDaysBefore: 30,
      };

      // WHEN/THEN: Throws error
      await expect(repository.create(input)).rejects.toThrow(
        'Emlékeztetőhöz jármű megadása kötelező'
      );
    });

    it('[P1] should throw error if both vehicle types specified', async () => {
      // GIVEN: Input with both vehicle IDs
      const input = {
        rentalVehicleId: 'rv-123',
        companyVehicleId: 'cv-456',
        documentType: VehicleDocumentType.KGFB_INSURANCE,
        expiryDate: new Date('2025-06-30'),
        reminderDaysBefore: 30,
      };

      // WHEN/THEN: Throws error
      await expect(repository.create(input)).rejects.toThrow(
        'Emlékeztető csak egy járműhöz tartozhat'
      );
    });
  });

  describe('markAsSent()', () => {
    it('[P1] should mark reminder as sent with notification details', async () => {
      // GIVEN: Reminder exists
      const mockUpdated = {
        id: 'rem-1',
        rentalVehicleId: 'rv-123',
        companyVehicleId: null,
        documentType: 'KGFB_INSURANCE',
        expiryDate: new Date('2025-06-30'),
        reminderDaysBefore: 30,
        notificationSentAt: new Date(),
        notificationType: 'EMAIL',
        sentToUserIds: ['user-1', 'user-2'],
        createdAt: new Date(),
      };
      vi.mocked(mockPrisma.vehicleDocumentReminder.update).mockResolvedValue(mockUpdated as never);

      // WHEN: Marking as sent
      const result = await repository.markAsSent('rem-1', NotificationType.EMAIL, [
        'user-1',
        'user-2',
      ]);

      // THEN: Reminder is updated
      expect(mockPrisma.vehicleDocumentReminder.update).toHaveBeenCalledWith({
        where: { id: 'rem-1' },
        data: {
          notificationSentAt: expect.any(Date),
          notificationType: expect.any(String), // 'email' lowercase
          sentToUserIds: ['user-1', 'user-2'],
        },
      });
      expect(result.notificationType).toBe('EMAIL');
      expect(result.sentToUserIds).toContain('user-1');
    });
  });

  describe('wasReminderSent()', () => {
    it('[P1] should return true if reminder was already sent', async () => {
      // GIVEN: Sent reminder exists
      const mockReminder = {
        id: 'rem-sent',
        rentalVehicleId: 'rv-123',
        companyVehicleId: null,
        documentType: 'KGFB_INSURANCE',
        expiryDate: new Date(),
        reminderDaysBefore: 30,
        notificationSentAt: new Date(),
        notificationType: 'EMAIL',
        sentToUserIds: ['user-1'],
        createdAt: new Date(),
      };
      vi.mocked(mockPrisma.vehicleDocumentReminder.findFirst).mockResolvedValue(
        mockReminder as never
      );

      // WHEN: Checking if reminder was sent
      const result = await repository.wasReminderSent(
        'rental',
        'rv-123',
        VehicleDocumentType.KGFB_INSURANCE,
        30
      );

      // THEN: Returns true
      expect(result).toBe(true);
    });

    it('[P1] should return false if reminder was not sent', async () => {
      // GIVEN: No sent reminder exists
      vi.mocked(mockPrisma.vehicleDocumentReminder.findFirst).mockResolvedValue(null);

      // WHEN: Checking if reminder was sent
      const result = await repository.wasReminderSent(
        'company',
        'cv-456',
        VehicleDocumentType.TECHNICAL_INSPECTION,
        14
      );

      // THEN: Returns false
      expect(result).toBe(false);
    });
  });

  describe('createBulkReminders()', () => {
    it('[P1] should create multiple reminders for documents', async () => {
      // GIVEN: Documents needing reminders
      const documents = [
        {
          vehicleType: 'rental' as const,
          vehicleId: 'rv-1',
          documentType: VehicleDocumentType.KGFB_INSURANCE,
          expiryDate: new Date('2025-06-30'),
        },
        {
          vehicleType: 'company' as const,
          vehicleId: 'cv-1',
          documentType: VehicleDocumentType.CASCO_INSURANCE,
          expiryDate: new Date('2025-09-01'),
        },
      ];
      const reminderDays = [30, 14, 7];

      // Mock: no existing reminders
      vi.mocked(mockPrisma.vehicleDocumentReminder.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.vehicleDocumentReminder.createMany).mockResolvedValue({ count: 6 });

      // WHEN: Creating bulk reminders
      const result = await repository.createBulkReminders(documents, reminderDays);

      // THEN: Reminders are created (2 docs × 3 reminder days = 6)
      expect(result).toBe(6);
    });

    it('[P1] should skip already sent reminders', async () => {
      // GIVEN: One reminder already sent
      const documents = [
        {
          vehicleType: 'rental' as const,
          vehicleId: 'rv-1',
          documentType: VehicleDocumentType.KGFB_INSURANCE,
          expiryDate: new Date('2025-06-30'),
        },
      ];

      // First call returns existing, second returns null
      vi.mocked(mockPrisma.vehicleDocumentReminder.findFirst)
        .mockResolvedValueOnce({
          id: 'existing',
          notificationSentAt: new Date(),
        } as never)
        .mockResolvedValue(null);

      vi.mocked(mockPrisma.vehicleDocumentReminder.createMany).mockResolvedValue({ count: 2 });

      // WHEN: Creating bulk reminders for 3 day intervals
      const result = await repository.createBulkReminders(documents, [30, 14, 7]);

      // THEN: Only 2 created (skipped the already sent one)
      expect(result).toBe(2);
    });

    it('[P1] should return 0 when no reminders to create', async () => {
      // GIVEN: All reminders already sent
      vi.mocked(mockPrisma.vehicleDocumentReminder.findFirst).mockResolvedValue({
        id: 'existing',
        notificationSentAt: new Date(),
      } as never);

      // WHEN: Creating bulk reminders
      const result = await repository.createBulkReminders(
        [
          {
            vehicleType: 'rental',
            vehicleId: 'rv-1',
            documentType: VehicleDocumentType.KGFB_INSURANCE,
            expiryDate: new Date(),
          },
        ],
        [30]
      );

      // THEN: Returns 0
      expect(result).toBe(0);
    });
  });

  describe('deleteOldReminders()', () => {
    it('[P1] should delete old processed reminders', async () => {
      // GIVEN: Old reminders exist
      vi.mocked(mockPrisma.vehicleDocumentReminder.deleteMany).mockResolvedValue({ count: 5 });

      // WHEN: Deleting reminders older than 90 days
      const result = await repository.deleteOldReminders(90);

      // THEN: Old reminders are deleted
      expect(mockPrisma.vehicleDocumentReminder.deleteMany).toHaveBeenCalledWith({
        where: {
          notificationSentAt: { not: null },
          expiryDate: { lt: expect.any(Date) },
        },
      });
      expect(result).toBe(5);
    });
  });
});
