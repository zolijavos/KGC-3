/**
 * @kgc/partner - PartnerSuspensionService Tests
 * Story 44-2: Partner felfüggesztés
 *
 * TDD: Tests written FIRST before implementation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerSuspensionService } from './partner-suspension.service';

describe('PartnerSuspensionService', () => {
  let service: PartnerSuspensionService;

  beforeEach(() => {
    service = new PartnerSuspensionService();
  });

  describe('suspend', () => {
    it('should suspend a partner with reason', async () => {
      service.addPartnerForTest({
        id: 'partner-1',
        tenantId: 'tenant-1',
        name: 'Test Partner',
        email: 'test@partner.hu',
        status: 'ACTIVE',
        category: 'RETAIL',
        totalOutstanding: 500000,
      });

      const result = await service.suspend('partner-1', '45+ napos lejárt tartozás');

      expect(result.success).toBe(true);
      expect(result.suspendedAt).toBeDefined();
    });

    it('should set suspensionReason on partner', async () => {
      service.addPartnerForTest({
        id: 'partner-2',
        tenantId: 'tenant-1',
        name: 'Late Partner',
        email: 'late@partner.hu',
        status: 'ACTIVE',
        category: 'RETAIL',
        totalOutstanding: 800000,
      });

      await service.suspend('partner-2', 'Tartós nemfizetés');

      const partner = await service.getPartner('partner-2');
      expect(partner?.status).toBe('SUSPENDED');
      expect(partner?.suspensionReason).toBe('Tartós nemfizetés');
    });

    it('should not suspend already suspended partner', async () => {
      service.addPartnerForTest({
        id: 'partner-3',
        tenantId: 'tenant-1',
        name: 'Already Suspended',
        email: 'suspended@partner.hu',
        status: 'SUSPENDED',
        category: 'RETAIL',
        totalOutstanding: 300000,
        suspendedAt: new Date('2026-01-15'),
        suspensionReason: 'Korábbi tartozás',
      });

      const result = await service.suspend('partner-3', 'Új ok');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already suspended');
    });

    it('should not suspend VIP partner automatically', async () => {
      service.addPartnerForTest({
        id: 'partner-vip',
        tenantId: 'tenant-1',
        name: 'VIP Partner Kft.',
        email: 'vip@partner.hu',
        status: 'ACTIVE',
        category: 'VIP',
        totalOutstanding: 1000000,
      });

      const result = await service.suspend('partner-vip', 'Lejárt tartozás', { autoSuspend: true });

      expect(result.success).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.error).toContain('VIP');
    });
  });

  describe('unsuspend', () => {
    it('should unsuspend a partner', async () => {
      service.addPartnerForTest({
        id: 'partner-unsuspend',
        tenantId: 'tenant-1',
        name: 'To Unsuspend',
        email: 'unsuspend@partner.hu',
        status: 'SUSPENDED',
        category: 'RETAIL',
        totalOutstanding: 0,
        suspendedAt: new Date('2026-01-15'),
        suspensionReason: 'Tartozás',
      });

      const result = await service.unsuspend('partner-unsuspend', 'admin-1');

      expect(result.success).toBe(true);
      expect(result.unsuspendedAt).toBeDefined();
    });

    it('should clear suspension fields', async () => {
      service.addPartnerForTest({
        id: 'partner-clear',
        tenantId: 'tenant-1',
        name: 'Clear Partner',
        email: 'clear@partner.hu',
        status: 'SUSPENDED',
        category: 'RETAIL',
        totalOutstanding: 0,
        suspendedAt: new Date('2026-01-15'),
        suspensionReason: 'Tartozás',
      });

      await service.unsuspend('partner-clear', 'admin-1');

      const partner = await service.getPartner('partner-clear');
      expect(partner?.status).toBe('ACTIVE');
      expect(partner?.suspendedAt).toBeUndefined();
      expect(partner?.suspensionReason).toBeUndefined();
    });

    it('should create audit log entry', async () => {
      const mockAuditLogger = vi.fn();
      service.setAuditLogger(mockAuditLogger);

      service.addPartnerForTest({
        id: 'partner-audit',
        tenantId: 'tenant-1',
        name: 'Audit Partner',
        email: 'audit@partner.hu',
        status: 'SUSPENDED',
        category: 'RETAIL',
        totalOutstanding: 0,
        suspendedAt: new Date('2026-01-15'),
        suspensionReason: 'Tartozás',
      });

      await service.unsuspend('partner-audit', 'admin-1');

      expect(mockAuditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PARTNER_UNSUSPENDED',
          partnerId: 'partner-audit',
          performedBy: 'admin-1',
        })
      );
    });

    it('should fail if partner not suspended', async () => {
      service.addPartnerForTest({
        id: 'partner-active',
        tenantId: 'tenant-1',
        name: 'Active Partner',
        email: 'active@partner.hu',
        status: 'ACTIVE',
        category: 'RETAIL',
        totalOutstanding: 0,
      });

      const result = await service.unsuspend('partner-active', 'admin-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not suspended');
    });
  });

  describe('checkCanStartRental', () => {
    it('should allow rental for active partner', async () => {
      service.addPartnerForTest({
        id: 'partner-ok',
        tenantId: 'tenant-1',
        name: 'OK Partner',
        email: 'ok@partner.hu',
        status: 'ACTIVE',
        category: 'RETAIL',
        totalOutstanding: 50000,
      });

      const result = await service.checkCanStartRental('partner-ok');

      expect(result.canStart).toBe(true);
    });

    it('should block rental for suspended partner', async () => {
      service.addPartnerForTest({
        id: 'partner-blocked',
        tenantId: 'tenant-1',
        name: 'Blocked Partner',
        email: 'blocked@partner.hu',
        status: 'SUSPENDED',
        category: 'RETAIL',
        totalOutstanding: 500000,
        suspendedAt: new Date('2026-01-15'),
        suspensionReason: 'Tartozás rendezése szükséges',
      });

      const result = await service.checkCanStartRental('partner-blocked');

      expect(result.canStart).toBe(false);
      expect(result.reason).toContain('felfüggesztve');
      expect(result.outstandingAmount).toBe(500000);
    });

    it('should include outstanding amount in error message', async () => {
      service.addPartnerForTest({
        id: 'partner-debt',
        tenantId: 'tenant-1',
        name: 'Debt Partner',
        email: 'debt@partner.hu',
        status: 'SUSPENDED',
        category: 'RETAIL',
        totalOutstanding: 750000,
        suspendedAt: new Date('2026-01-15'),
        suspensionReason: 'Nemfizetés',
      });

      const result = await service.checkCanStartRental('partner-debt');

      expect(result.message).toContain('750000');
    });
  });

  describe('checkSuspensionEligibility', () => {
    it('should return eligible for 45+ days overdue with 3 reminders', async () => {
      service.addPartnerForTest({
        id: 'partner-eligible',
        tenantId: 'tenant-1',
        name: 'Eligible Partner',
        email: 'eligible@partner.hu',
        status: 'ACTIVE',
        category: 'RETAIL',
        totalOutstanding: 600000,
        oldestOverdueDays: 50,
        remindersSent: 3,
      });

      const result = await service.checkSuspensionEligibility('partner-eligible');

      expect(result.eligible).toBe(true);
      expect(result.daysOverdue).toBe(50);
      expect(result.remindersSent).toBe(3);
    });

    it('should return not eligible for less than 45 days overdue', async () => {
      service.addPartnerForTest({
        id: 'partner-not-yet',
        tenantId: 'tenant-1',
        name: 'Not Yet Partner',
        email: 'notyet@partner.hu',
        status: 'ACTIVE',
        category: 'RETAIL',
        totalOutstanding: 400000,
        oldestOverdueDays: 40,
        remindersSent: 2,
      });

      const result = await service.checkSuspensionEligibility('partner-not-yet');

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('45 nap');
    });

    it('should return not eligible for VIP even with 60 days overdue', async () => {
      service.addPartnerForTest({
        id: 'partner-vip-old',
        tenantId: 'tenant-1',
        name: 'VIP Old Debt',
        email: 'vipold@partner.hu',
        status: 'ACTIVE',
        category: 'VIP',
        totalOutstanding: 2000000,
        oldestOverdueDays: 60,
        remindersSent: 3,
      });

      const result = await service.checkSuspensionEligibility('partner-vip-old');

      expect(result.eligible).toBe(false);
      expect(result.requiresManualReview).toBe(true);
      expect(result.reason).toContain('VIP');
    });
  });

  describe('notifyManager', () => {
    it('should notify manager for VIP partner with overdue debt', async () => {
      const mockNotifier = vi.fn().mockResolvedValue({ success: true });
      service.setManagerNotifier(mockNotifier);

      service.addPartnerForTest({
        id: 'partner-notify',
        tenantId: 'tenant-1',
        name: 'VIP Notify Partner',
        email: 'vipnotify@partner.hu',
        status: 'ACTIVE',
        category: 'VIP',
        totalOutstanding: 1500000,
        oldestOverdueDays: 50,
        remindersSent: 3,
      });

      const result = await service.notifyManager('partner-notify', 'VIP partner 50 napos késéssel');

      expect(result.success).toBe(true);
      expect(mockNotifier).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerId: 'partner-notify',
          partnerName: 'VIP Notify Partner',
          message: expect.stringContaining('VIP'),
        })
      );
    });
  });
});
