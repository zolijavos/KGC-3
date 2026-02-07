/**
 * @kgc/accounting - ReportSchedulerService Tests
 * Story 43-3: Automatikus email riportok
 *
 * TDD: Tests written FIRST before implementation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailReportSettings, ReportSchedulerService } from './report-scheduler.service';

describe('ReportSchedulerService', () => {
  let service: ReportSchedulerService;

  beforeEach(() => {
    service = new ReportSchedulerService();
  });

  describe('saveSettings', () => {
    it('should save email report settings', async () => {
      const settings: EmailReportSettings = {
        tenantId: 'tenant-1',
        email: 'konyvelo@ceg.hu',
        enabled: true,
        format: 'xlsx',
        reportTypes: ['invoices', 'vat', 'deposits'],
        dayOfMonth: 1,
      };

      const result = await service.saveSettings(settings);

      expect(result.success).toBe(true);
      expect(result.settingsId).toBeDefined();
    });

    it('should validate email format', async () => {
      const settings: EmailReportSettings = {
        tenantId: 'tenant-1',
        email: 'invalid-email',
        enabled: true,
        format: 'csv',
        reportTypes: ['invoices'],
        dayOfMonth: 1,
      };

      const result = await service.saveSettings(settings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should update existing settings', async () => {
      const initialSettings: EmailReportSettings = {
        tenantId: 'tenant-1',
        email: 'konyvelo@ceg.hu',
        enabled: true,
        format: 'xlsx',
        reportTypes: ['invoices'],
        dayOfMonth: 1,
      };

      await service.saveSettings(initialSettings);

      const updatedSettings: EmailReportSettings = {
        tenantId: 'tenant-1',
        email: 'uj-konyvelo@ceg.hu',
        enabled: true,
        format: 'csv',
        reportTypes: ['invoices', 'vat'],
        dayOfMonth: 5,
      };

      const result = await service.saveSettings(updatedSettings);

      expect(result.success).toBe(true);

      const loaded = await service.getSettings('tenant-1');
      expect(loaded?.email).toBe('uj-konyvelo@ceg.hu');
      expect(loaded?.format).toBe('csv');
    });
  });

  describe('getSettings', () => {
    it('should return null for non-existent tenant', async () => {
      const result = await service.getSettings('non-existent');

      expect(result).toBeNull();
    });

    it('should return saved settings', async () => {
      await service.saveSettings({
        tenantId: 'tenant-1',
        email: 'konyvelo@ceg.hu',
        enabled: true,
        format: 'xlsx',
        reportTypes: ['invoices', 'vat'],
        dayOfMonth: 1,
      });

      const result = await service.getSettings('tenant-1');

      expect(result).toBeDefined();
      expect(result?.email).toBe('konyvelo@ceg.hu');
      expect(result?.reportTypes).toContain('invoices');
      expect(result?.reportTypes).toContain('vat');
    });
  });

  describe('scheduleMonthlyReport', () => {
    it('should schedule report for end of month', async () => {
      await service.saveSettings({
        tenantId: 'tenant-1',
        email: 'konyvelo@ceg.hu',
        enabled: true,
        format: 'xlsx',
        reportTypes: ['invoices'],
        dayOfMonth: 1,
      });

      const result = await service.scheduleMonthlyReport('tenant-1');

      expect(result.scheduled).toBe(true);
      expect(result.nextRunDate).toBeDefined();
    });

    it('should not schedule if settings disabled', async () => {
      await service.saveSettings({
        tenantId: 'tenant-1',
        email: 'konyvelo@ceg.hu',
        enabled: false,
        format: 'xlsx',
        reportTypes: ['invoices'],
        dayOfMonth: 1,
      });

      const result = await service.scheduleMonthlyReport('tenant-1');

      expect(result.scheduled).toBe(false);
      expect(result.reason).toContain('disabled');
    });
  });

  describe('sendReport', () => {
    it('should send report email with attachments', async () => {
      const mockSendEmail = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' });
      service.setEmailSender(mockSendEmail);

      await service.saveSettings({
        tenantId: 'tenant-1',
        email: 'konyvelo@ceg.hu',
        enabled: true,
        format: 'xlsx',
        reportTypes: ['invoices', 'vat'],
        dayOfMonth: 1,
      });

      const result = await service.sendReport('tenant-1', '2026-01');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'konyvelo@ceg.hu',
          attachments: expect.any(Array),
        })
      );
    });

    it('should retry 3 times on failure', async () => {
      const mockSendEmail = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, messageId: 'msg-456' });

      service.setEmailSender(mockSendEmail);

      await service.saveSettings({
        tenantId: 'tenant-1',
        email: 'konyvelo@ceg.hu',
        enabled: true,
        format: 'xlsx',
        reportTypes: ['invoices'],
        dayOfMonth: 1,
      });

      const result = await service.sendReport('tenant-1', '2026-01');

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(2);
      expect(mockSendEmail).toHaveBeenCalledTimes(3);
    });

    it('should notify admin after 3 failed retries', async () => {
      const mockSendEmail = vi.fn().mockRejectedValue(new Error('Permanent failure'));
      const mockNotifyAdmin = vi.fn().mockResolvedValue(true);

      service.setEmailSender(mockSendEmail);
      service.setAdminNotifier(mockNotifyAdmin);

      await service.saveSettings({
        tenantId: 'tenant-1',
        email: 'konyvelo@ceg.hu',
        enabled: true,
        format: 'xlsx',
        reportTypes: ['invoices'],
        dayOfMonth: 1,
      });

      const result = await service.sendReport('tenant-1', '2026-01');

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed after 3 retries');
      expect(mockNotifyAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          error: expect.any(String),
        })
      );
    });
  });
});
