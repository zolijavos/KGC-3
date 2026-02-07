/**
 * @kgc/rental-checkout - CardExpirationService Tests
 * Story 42-3: Kártya lejárat kezelés bérlés közben
 *
 * TDD: Tests written FIRST before implementation
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  CardExpirationAlert,
  CardExpirationService,
  DepositWithCard,
} from './card-expiration.service';

describe('CardExpirationService', () => {
  let service: CardExpirationService;

  beforeEach(() => {
    service = new CardExpirationService();
  });

  describe('checkCardExpirations', () => {
    it('should generate alert for card expiring in 5 days', () => {
      const now = new Date('2026-02-07T00:00:00Z');
      const deposits: DepositWithCard[] = [
        {
          id: 'deposit-1',
          rentalId: 'rental-1',
          tenantId: 'tenant-1',
          amount: 50000,
          cardExpiryDate: new Date('2026-02-12T00:00:00Z'), // Exactly 5 days from now
          cardLastFour: '1234',
          partnerId: 'partner-1',
          partnerName: 'Test Partner',
        },
      ];

      const alerts = service.checkCardExpirations(deposits, now);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]?.daysUntilExpiry).toBe(5);
      expect(alerts[0]?.alertLevel).toBe('WARNING');
    });

    it('should generate URGENT alert for expired card', () => {
      const now = new Date('2026-02-07T00:00:00Z');
      const deposits: DepositWithCard[] = [
        {
          id: 'deposit-2',
          rentalId: 'rental-2',
          tenantId: 'tenant-1',
          amount: 80000,
          cardExpiryDate: new Date('2026-02-05T00:00:00Z'), // 2 days ago
          cardLastFour: '5678',
          partnerId: 'partner-2',
          partnerName: 'Late Partner',
        },
      ];

      const alerts = service.checkCardExpirations(deposits, now);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]?.daysUntilExpiry).toBe(-2);
      expect(alerts[0]?.alertLevel).toBe('URGENT');
      expect(alerts[0]?.isExpired).toBe(true);
    });

    it('should not generate alert for card with more than 5 days left', () => {
      const now = new Date('2026-02-07T00:00:00Z');
      const deposits: DepositWithCard[] = [
        {
          id: 'deposit-3',
          rentalId: 'rental-3',
          tenantId: 'tenant-1',
          amount: 60000,
          cardExpiryDate: new Date('2026-02-28T00:00:00Z'), // 21 days from now
          cardLastFour: '9012',
          partnerId: 'partner-3',
          partnerName: 'Future Partner',
        },
      ];

      const alerts = service.checkCardExpirations(deposits, now);

      expect(alerts).toHaveLength(0);
    });

    it('should handle deposits without card expiry date', () => {
      const now = new Date('2026-02-07T00:00:00Z');
      const deposits: DepositWithCard[] = [
        {
          id: 'deposit-4',
          rentalId: 'rental-4',
          tenantId: 'tenant-1',
          amount: 40000,
          cardExpiryDate: undefined, // No expiry date (cash deposit)
          cardLastFour: undefined,
          partnerId: 'partner-4',
          partnerName: 'Cash Partner',
        },
      ];

      const alerts = service.checkCardExpirations(deposits, now);

      expect(alerts).toHaveLength(0);
    });

    it('should generate WARNING alert for card expiring in 3 days', () => {
      const now = new Date('2026-02-07T00:00:00Z');
      const deposits: DepositWithCard[] = [
        {
          id: 'deposit-5',
          rentalId: 'rental-5',
          tenantId: 'tenant-1',
          amount: 70000,
          cardExpiryDate: new Date('2026-02-10T00:00:00Z'), // 3 days from now
          cardLastFour: '3456',
          partnerId: 'partner-5',
          partnerName: 'Soon Partner',
        },
      ];

      const alerts = service.checkCardExpirations(deposits, now);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]?.alertLevel).toBe('WARNING');
    });
  });

  describe('calculateDaysUntilCardExpiry', () => {
    it('should calculate positive days for future expiry', () => {
      const now = new Date('2026-02-07T00:00:00Z');
      const expiryDate = new Date('2026-02-12T00:00:00Z');

      const days = service.calculateDaysUntilCardExpiry(expiryDate, now);

      expect(days).toBe(5);
    });

    it('should calculate negative days for past expiry', () => {
      const now = new Date('2026-02-07T00:00:00Z');
      const expiryDate = new Date('2026-02-04T00:00:00Z');

      const days = service.calculateDaysUntilCardExpiry(expiryDate, now);

      expect(days).toBe(-3);
    });
  });

  describe('replaceCard', () => {
    it('should create replacement record with new card', async () => {
      // First add a deposit to replace
      service.addDepositForTest({
        id: 'deposit-1',
        rentalId: 'rental-1',
        tenantId: 'tenant-1',
        amount: 50000,
        cardExpiryDate: new Date('2026-02-10'),
        cardLastFour: '1234',
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        transactionId: 'tx-old-999',
      });

      const newCardTransaction = {
        transactionId: 'tx-new-123',
        cardLastFour: '9999',
        cardExpiryDate: new Date('2028-12-31'),
        amount: 50000,
      };

      const result = await service.replaceCard('deposit-1', newCardTransaction);

      expect(result.success).toBe(true);
      expect(result.newCardLastFour).toBe('9999');
      expect(result.requiresRefund).toBe(true);
    });

    it('should track old card for refund processing', async () => {
      // First add a deposit with old card
      service.addDepositForTest({
        id: 'deposit-replace',
        rentalId: 'rental-replace',
        tenantId: 'tenant-1',
        amount: 60000,
        cardExpiryDate: new Date('2026-02-10'),
        cardLastFour: '1111',
        partnerId: 'partner-1',
        partnerName: 'Replace Partner',
        transactionId: 'tx-old-123',
      });

      const newCardTransaction = {
        transactionId: 'tx-new-456',
        cardLastFour: '2222',
        cardExpiryDate: new Date('2028-06-30'),
        amount: 60000,
      };

      const result = await service.replaceCard('deposit-replace', newCardTransaction);

      expect(result.success).toBe(true);
      expect(result.oldTransactionId).toBe('tx-old-123');
      expect(result.newTransactionId).toBe('tx-new-456');
    });
  });

  describe('getExpiringDeposits', () => {
    it('should return deposits with cards expiring within threshold', () => {
      const now = new Date('2026-02-07T10:00:00Z');

      // Add test deposits
      service.addDepositForTest({
        id: 'dep-1',
        rentalId: 'r-1',
        tenantId: 'tenant-1',
        amount: 50000,
        cardExpiryDate: new Date('2026-02-10'), // 3 days - should include
        cardLastFour: '1111',
        partnerId: 'p-1',
        partnerName: 'Partner 1',
      });

      service.addDepositForTest({
        id: 'dep-2',
        rentalId: 'r-2',
        tenantId: 'tenant-1',
        amount: 60000,
        cardExpiryDate: new Date('2026-02-20'), // 13 days - should exclude
        cardLastFour: '2222',
        partnerId: 'p-2',
        partnerName: 'Partner 2',
      });

      const expiring = service.getExpiringDeposits('tenant-1', 5, now);

      expect(expiring).toHaveLength(1);
      expect(expiring[0]?.id).toBe('dep-1');
    });
  });

  describe('getAlertMessage', () => {
    it('should return Hungarian message for WARNING alert', () => {
      const alert: CardExpirationAlert = {
        depositId: 'dep-1',
        rentalId: 'rental-1',
        tenantId: 'tenant-1',
        alertLevel: 'WARNING',
        daysUntilExpiry: 3,
        isExpired: false,
        cardLastFour: '1234',
        partnerName: 'Test Partner',
        depositAmount: 50000,
        createdAt: new Date(),
      };

      const message = service.getAlertMessage(alert);

      expect(message).toContain('3 napon belül');
      expect(message).toContain('Test Partner');
      expect(message).toContain('1234');
    });

    it('should return Hungarian message for URGENT (expired) alert', () => {
      const alert: CardExpirationAlert = {
        depositId: 'dep-2',
        rentalId: 'rental-2',
        tenantId: 'tenant-1',
        alertLevel: 'URGENT',
        daysUntilExpiry: -2,
        isExpired: true,
        cardLastFour: '5678',
        partnerName: 'Late Partner',
        depositAmount: 80000,
        createdAt: new Date(),
      };

      const message = service.getAlertMessage(alert);

      expect(message).toContain('LEJÁRT');
      expect(message).toContain('Late Partner');
    });
  });
});
