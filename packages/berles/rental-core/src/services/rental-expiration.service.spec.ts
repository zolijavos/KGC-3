/**
 * @kgc/rental-core - RentalExpirationService Tests
 * Story 42-2: Automatikus megújulás értesítés
 *
 * TDD: Tests written FIRST before implementation
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  ExpirationLevel,
  RentalExpirationNotification,
  RentalExpirationService,
  RentalForExpiration,
} from './rental-expiration.service';

describe('RentalExpirationService', () => {
  let service: RentalExpirationService;

  beforeEach(() => {
    service = new RentalExpirationService();
  });

  describe('checkExpirations', () => {
    it('should generate INFO notification for rental expiring in 7 days', () => {
      const now = new Date('2026-02-07T10:00:00Z');
      const rental: RentalForExpiration = {
        id: 'rental-1',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        partnerPhone: '+36301234567',
        endDate: new Date('2026-02-14T10:00:00Z'), // 7 days from now
        equipmentName: 'Fúró-001',
        assignedUserId: 'user-1',
      };

      const notifications = service.checkExpirations([rental], now);

      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.level).toBe(ExpirationLevel.INFO);
      expect(notifications[0]?.daysUntilExpiry).toBe(7);
    });

    it('should generate WARNING notification for rental expiring in 3 days', () => {
      const now = new Date('2026-02-07T10:00:00Z');
      const rental: RentalForExpiration = {
        id: 'rental-2',
        tenantId: 'tenant-1',
        partnerId: 'partner-2',
        partnerName: 'Urgent Partner',
        partnerPhone: '+36301234568',
        endDate: new Date('2026-02-10T10:00:00Z'), // 3 days from now
        equipmentName: 'Csiszoló-002',
        assignedUserId: 'user-1',
      };

      const notifications = service.checkExpirations([rental], now);

      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.level).toBe(ExpirationLevel.WARNING);
      expect(notifications[0]?.daysUntilExpiry).toBe(3);
    });

    it('should generate URGENT notification for expired rental', () => {
      const now = new Date('2026-02-07T10:00:00Z');
      const rental: RentalForExpiration = {
        id: 'rental-3',
        tenantId: 'tenant-1',
        partnerId: 'partner-3',
        partnerName: 'Late Partner',
        partnerPhone: '+36301234569',
        endDate: new Date('2026-02-06T10:00:00Z'), // 1 day ago
        equipmentName: 'Vágó-003',
        assignedUserId: 'user-1',
      };

      const notifications = service.checkExpirations([rental], now);

      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.level).toBe(ExpirationLevel.URGENT);
      expect(notifications[0]?.daysUntilExpiry).toBe(-1);
      expect(notifications[0]?.isOverdue).toBe(true);
    });

    it('should not generate notification for rental with more than 7 days left', () => {
      const now = new Date('2026-02-07T10:00:00Z');
      const rental: RentalForExpiration = {
        id: 'rental-4',
        tenantId: 'tenant-1',
        partnerId: 'partner-4',
        partnerName: 'Far Partner',
        partnerPhone: '+36301234570',
        endDate: new Date('2026-02-20T10:00:00Z'), // 13 days from now
        equipmentName: 'Gép-004',
        assignedUserId: 'user-1',
      };

      const notifications = service.checkExpirations([rental], now);

      expect(notifications).toHaveLength(0);
    });

    it('should handle multiple rentals with different expiration dates', () => {
      const now = new Date('2026-02-07T10:00:00Z');
      const rentals: RentalForExpiration[] = [
        {
          id: 'rental-1',
          tenantId: 'tenant-1',
          partnerId: 'partner-1',
          partnerName: 'Partner A',
          partnerPhone: '+36301234567',
          endDate: new Date('2026-02-14T10:00:00Z'), // 7 days - INFO
          equipmentName: 'Gép A',
          assignedUserId: 'user-1',
        },
        {
          id: 'rental-2',
          tenantId: 'tenant-1',
          partnerId: 'partner-2',
          partnerName: 'Partner B',
          partnerPhone: '+36301234568',
          endDate: new Date('2026-02-10T10:00:00Z'), // 3 days - WARNING
          equipmentName: 'Gép B',
          assignedUserId: 'user-1',
        },
        {
          id: 'rental-3',
          tenantId: 'tenant-1',
          partnerId: 'partner-3',
          partnerName: 'Partner C',
          partnerPhone: '+36301234569',
          endDate: new Date('2026-02-05T10:00:00Z'), // -2 days - URGENT
          equipmentName: 'Gép C',
          assignedUserId: 'user-1',
        },
        {
          id: 'rental-4',
          tenantId: 'tenant-1',
          partnerId: 'partner-4',
          partnerName: 'Partner D',
          partnerPhone: '+36301234570',
          endDate: new Date('2026-02-28T10:00:00Z'), // 21 days - no notification
          equipmentName: 'Gép D',
          assignedUserId: 'user-1',
        },
      ];

      const notifications = service.checkExpirations(rentals, now);

      expect(notifications).toHaveLength(3);
      expect(notifications.filter(n => n.level === ExpirationLevel.INFO)).toHaveLength(1);
      expect(notifications.filter(n => n.level === ExpirationLevel.WARNING)).toHaveLength(1);
      expect(notifications.filter(n => n.level === ExpirationLevel.URGENT)).toHaveLength(1);
    });
  });

  describe('getNotificationMessage', () => {
    it('should return Hungarian INFO message for 7-day warning', () => {
      const notification: RentalExpirationNotification = {
        rentalId: 'rental-1',
        tenantId: 'tenant-1',
        level: ExpirationLevel.INFO,
        daysUntilExpiry: 7,
        isOverdue: false,
        partnerName: 'Test Partner',
        partnerPhone: '+36301234567',
        equipmentName: 'Fúró-001',
        expiryDate: new Date('2026-02-14'),
        assignedUserId: 'user-1',
        createdAt: new Date(),
      };

      const message = service.getNotificationMessage(notification);

      expect(message).toContain('lejár 7 nap múlva');
      expect(message).toContain('Test Partner');
      expect(message).toContain('Fúró-001');
    });

    it('should return Hungarian WARNING message for 3-day warning', () => {
      const notification: RentalExpirationNotification = {
        rentalId: 'rental-1',
        tenantId: 'tenant-1',
        level: ExpirationLevel.WARNING,
        daysUntilExpiry: 3,
        isOverdue: false,
        partnerName: 'Urgent Partner',
        partnerPhone: '+36301234567',
        equipmentName: 'Csiszoló-002',
        expiryDate: new Date('2026-02-10'),
        assignedUserId: 'user-1',
        createdAt: new Date(),
      };

      const message = service.getNotificationMessage(notification);

      expect(message).toContain('SÜRGŐS');
      expect(message).toContain('3 nap múlva');
    });

    it('should return Hungarian URGENT message for overdue rental', () => {
      const notification: RentalExpirationNotification = {
        rentalId: 'rental-1',
        tenantId: 'tenant-1',
        level: ExpirationLevel.URGENT,
        daysUntilExpiry: -2,
        isOverdue: true,
        partnerName: 'Late Partner',
        partnerPhone: '+36301234567',
        equipmentName: 'Vágó-003',
        expiryDate: new Date('2026-02-05'),
        assignedUserId: 'user-1',
        createdAt: new Date(),
      };

      const message = service.getNotificationMessage(notification);

      expect(message).toContain('LEJÁRT');
      expect(message).toContain('2 napja');
      expect(message).toContain('Late Partner');
    });
  });

  describe('calculateDaysUntilExpiry', () => {
    it('should calculate positive days for future date', () => {
      const now = new Date('2026-02-07T10:00:00Z');
      const expiryDate = new Date('2026-02-14T10:00:00Z');

      const days = service.calculateDaysUntilExpiry(expiryDate, now);

      expect(days).toBe(7);
    });

    it('should calculate negative days for past date', () => {
      const now = new Date('2026-02-07T10:00:00Z');
      const expiryDate = new Date('2026-02-05T10:00:00Z');

      const days = service.calculateDaysUntilExpiry(expiryDate, now);

      expect(days).toBe(-2);
    });

    it('should return 0 for same day', () => {
      const now = new Date('2026-02-07T10:00:00Z');
      const expiryDate = new Date('2026-02-07T15:00:00Z');

      const days = service.calculateDaysUntilExpiry(expiryDate, now);

      expect(days).toBe(0);
    });
  });

  describe('determineExpirationLevel', () => {
    it('should return INFO for 7 days', () => {
      expect(service.determineExpirationLevel(7)).toBe(ExpirationLevel.INFO);
    });

    it('should return INFO for 5 days', () => {
      expect(service.determineExpirationLevel(5)).toBe(ExpirationLevel.INFO);
    });

    it('should return WARNING for 3 days', () => {
      expect(service.determineExpirationLevel(3)).toBe(ExpirationLevel.WARNING);
    });

    it('should return WARNING for 1 day', () => {
      expect(service.determineExpirationLevel(1)).toBe(ExpirationLevel.WARNING);
    });

    it('should return URGENT for 0 days (today)', () => {
      expect(service.determineExpirationLevel(0)).toBe(ExpirationLevel.URGENT);
    });

    it('should return URGENT for negative days (overdue)', () => {
      expect(service.determineExpirationLevel(-3)).toBe(ExpirationLevel.URGENT);
    });

    it('should return null for more than 7 days', () => {
      expect(service.determineExpirationLevel(8)).toBeNull();
      expect(service.determineExpirationLevel(30)).toBeNull();
    });
  });

  describe('groupByLevel', () => {
    it('should group notifications by expiration level', () => {
      const notifications: RentalExpirationNotification[] = [
        {
          rentalId: 'r1',
          tenantId: 't1',
          level: ExpirationLevel.INFO,
          daysUntilExpiry: 7,
          isOverdue: false,
          partnerName: 'P1',
          equipmentName: 'E1',
          expiryDate: new Date(),
          assignedUserId: 'u1',
          createdAt: new Date(),
        },
        {
          rentalId: 'r2',
          tenantId: 't1',
          level: ExpirationLevel.WARNING,
          daysUntilExpiry: 3,
          isOverdue: false,
          partnerName: 'P2',
          equipmentName: 'E2',
          expiryDate: new Date(),
          assignedUserId: 'u1',
          createdAt: new Date(),
        },
        {
          rentalId: 'r3',
          tenantId: 't1',
          level: ExpirationLevel.URGENT,
          daysUntilExpiry: -1,
          isOverdue: true,
          partnerName: 'P3',
          equipmentName: 'E3',
          expiryDate: new Date(),
          assignedUserId: 'u1',
          createdAt: new Date(),
        },
        {
          rentalId: 'r4',
          tenantId: 't1',
          level: ExpirationLevel.INFO,
          daysUntilExpiry: 6,
          isOverdue: false,
          partnerName: 'P4',
          equipmentName: 'E4',
          expiryDate: new Date(),
          assignedUserId: 'u1',
          createdAt: new Date(),
        },
      ];

      const grouped = service.groupByLevel(notifications);

      expect(grouped[ExpirationLevel.INFO]).toHaveLength(2);
      expect(grouped[ExpirationLevel.WARNING]).toHaveLength(1);
      expect(grouped[ExpirationLevel.URGENT]).toHaveLength(1);
    });
  });
});
