/**
 * @kgc/partner - PaymentReminderService Tests
 * Story 44-1: Fizetési emlékeztetők
 *
 * TDD: Tests written FIRST before implementation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentReminderService } from './payment-reminder.service';

describe('PaymentReminderService', () => {
  let service: PaymentReminderService;

  beforeEach(() => {
    service = new PaymentReminderService();
  });

  describe('checkOverdueInvoices', () => {
    it('should identify invoices overdue for 7 days', async () => {
      const now = new Date('2026-02-07');
      const overdueDate = new Date('2026-01-31'); // 7 days overdue

      service.addInvoiceForTest({
        id: 'inv-1',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        partnerEmail: 'partner@test.hu',
        amount: 100000,
        dueDate: overdueDate,
        status: 'OVERDUE',
      });

      const result = await service.checkOverdueInvoices('tenant-1', now);

      expect(result).toHaveLength(1);
      expect(result[0]?.daysOverdue).toBe(7);
      expect(result[0]?.suggestedLevel).toBe('FIRST');
    });

    it('should suggest SECOND level for 14+ days overdue with FIRST already sent', async () => {
      const now = new Date('2026-02-14');
      const overdueDate = new Date('2026-01-31'); // 14 days overdue
      const mockEmailSender = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-setup' });
      service.setEmailSender(mockEmailSender);

      service.addInvoiceForTest({
        id: 'inv-2',
        tenantId: 'tenant-1',
        partnerId: 'partner-2',
        partnerName: 'Late Partner',
        partnerEmail: 'late@test.hu',
        amount: 200000,
        dueDate: overdueDate,
        status: 'OVERDUE',
      });

      // Send FIRST reminder first
      await service.sendReminder('inv-2', 'FIRST');

      const result = await service.checkOverdueInvoices('tenant-1', now);

      expect(result[0]?.suggestedLevel).toBe('SECOND');
    });

    it('should suggest FINAL level for 30+ days overdue with FIRST and SECOND already sent', async () => {
      const now = new Date('2026-03-02');
      const overdueDate = new Date('2026-01-31'); // 30 days overdue
      const mockEmailSender = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-setup' });
      service.setEmailSender(mockEmailSender);

      service.addInvoiceForTest({
        id: 'inv-3',
        tenantId: 'tenant-1',
        partnerId: 'partner-3',
        partnerName: 'Very Late Partner',
        partnerEmail: 'verylate@test.hu',
        amount: 300000,
        dueDate: overdueDate,
        status: 'OVERDUE',
      });

      // Send previous reminders
      await service.sendReminder('inv-3', 'FIRST');
      await service.sendReminder('inv-3', 'SECOND');

      const result = await service.checkOverdueInvoices('tenant-1', now);

      expect(result[0]?.suggestedLevel).toBe('FINAL');
    });

    it('should filter by tenant', async () => {
      const now = new Date('2026-02-07');
      const overdueDate = new Date('2026-01-31');

      service.addInvoiceForTest({
        id: 'inv-t1',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'Partner T1',
        partnerEmail: 't1@test.hu',
        amount: 100000,
        dueDate: overdueDate,
        status: 'OVERDUE',
      });

      service.addInvoiceForTest({
        id: 'inv-t2',
        tenantId: 'tenant-2',
        partnerId: 'partner-2',
        partnerName: 'Partner T2',
        partnerEmail: 't2@test.hu',
        amount: 200000,
        dueDate: overdueDate,
        status: 'OVERDUE',
      });

      const result = await service.checkOverdueInvoices('tenant-1', now);

      expect(result).toHaveLength(1);
      expect(result[0]?.tenantId).toBe('tenant-1');
    });
  });

  describe('sendReminder', () => {
    it('should create FIRST level reminder record', async () => {
      const mockEmailSender = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' });
      service.setEmailSender(mockEmailSender);

      service.addInvoiceForTest({
        id: 'inv-send-1',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'Test Partner',
        partnerEmail: 'test@partner.hu',
        amount: 150000,
        dueDate: new Date('2026-01-31'),
        status: 'OVERDUE',
      });

      const result = await service.sendReminder('inv-send-1', 'FIRST');

      expect(result.success).toBe(true);
      expect(result.level).toBe('FIRST');
      expect(result.reminderId).toBeDefined();
    });

    it('should use appropriate tone for each level', async () => {
      const mockEmailSender = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-456' });
      service.setEmailSender(mockEmailSender);

      service.addInvoiceForTest({
        id: 'inv-tone',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'Tone Partner',
        partnerEmail: 'tone@partner.hu',
        amount: 250000,
        dueDate: new Date('2026-01-31'),
        status: 'OVERDUE',
      });

      await service.sendReminder('inv-tone', 'SECOND');

      expect(mockEmailSender).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Fizetési felszólítás'),
        })
      );
    });

    it('should include suspension warning in FINAL reminder', async () => {
      const mockEmailSender = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-789' });
      service.setEmailSender(mockEmailSender);

      service.addInvoiceForTest({
        id: 'inv-final',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'Final Partner',
        partnerEmail: 'final@partner.hu',
        amount: 350000,
        dueDate: new Date('2026-01-01'),
        status: 'OVERDUE',
      });

      await service.sendReminder('inv-final', 'FINAL');

      expect(mockEmailSender).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('felfüggesztés'),
        })
      );
    });

    it('should prevent duplicate reminder at same level', async () => {
      const mockEmailSender = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-dup' });
      service.setEmailSender(mockEmailSender);

      service.addInvoiceForTest({
        id: 'inv-dup',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'Dup Partner',
        partnerEmail: 'dup@partner.hu',
        amount: 100000,
        dueDate: new Date('2026-01-31'),
        status: 'OVERDUE',
      });

      // First reminder
      await service.sendReminder('inv-dup', 'FIRST');

      // Second reminder at same level should fail
      const result = await service.sendReminder('inv-dup', 'FIRST');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already sent');
    });
  });

  describe('cancelReminders', () => {
    it('should cancel all reminders when invoice is paid', async () => {
      const mockEmailSender = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-cancel' });
      service.setEmailSender(mockEmailSender);

      service.addInvoiceForTest({
        id: 'inv-cancel',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'Cancel Partner',
        partnerEmail: 'cancel@partner.hu',
        amount: 200000,
        dueDate: new Date('2026-01-31'),
        status: 'OVERDUE',
      });

      // Send first reminder
      await service.sendReminder('inv-cancel', 'FIRST');

      // Cancel all reminders
      const result = await service.cancelReminders('inv-cancel', 'Invoice paid');

      expect(result.success).toBe(true);
      expect(result.cancelledCount).toBe(1);
    });
  });

  describe('getReminderHistory', () => {
    it('should return all reminders for an invoice', async () => {
      const mockEmailSender = vi.fn().mockResolvedValue({ success: true, messageId: 'msg-hist' });
      service.setEmailSender(mockEmailSender);

      service.addInvoiceForTest({
        id: 'inv-hist',
        tenantId: 'tenant-1',
        partnerId: 'partner-1',
        partnerName: 'History Partner',
        partnerEmail: 'history@partner.hu',
        amount: 300000,
        dueDate: new Date('2026-01-01'),
        status: 'OVERDUE',
      });

      await service.sendReminder('inv-hist', 'FIRST');
      await service.sendReminder('inv-hist', 'SECOND');

      const history = await service.getReminderHistory('inv-hist');

      expect(history).toHaveLength(2);
      expect(history[0]?.level).toBe('FIRST');
      expect(history[1]?.level).toBe('SECOND');
    });
  });

  describe('getEmailTemplate', () => {
    it('should return polite template for FIRST level', () => {
      const template = service.getEmailTemplate('FIRST');

      expect(template.subject).toContain('Fizetési emlékeztető');
      expect(template.tone).toBe('polite');
    });

    it('should return firm template for SECOND level', () => {
      const template = service.getEmailTemplate('SECOND');

      expect(template.subject).toContain('Fizetési felszólítás');
      expect(template.tone).toBe('firm');
    });

    it('should return warning template for FINAL level', () => {
      const template = service.getEmailTemplate('FINAL');

      expect(template.subject).toContain('Végleges fizetési felszólítás');
      expect(template.tone).toBe('warning');
      expect(template.body).toContain('felfüggesztés');
    });
  });

  describe('getDaysOverdue', () => {
    it('should calculate positive days for overdue invoice', () => {
      const now = new Date('2026-02-07');
      const dueDate = new Date('2026-01-31');

      const days = service.getDaysOverdue(dueDate, now);

      expect(days).toBe(7);
    });

    it('should return 0 for invoice not yet due', () => {
      const now = new Date('2026-01-25');
      const dueDate = new Date('2026-01-31');

      const days = service.getDaysOverdue(dueDate, now);

      expect(days).toBe(0);
    });
  });

  describe('determineSuggestedLevel', () => {
    it('should return null for less than 7 days overdue', () => {
      const level = service.determineSuggestedLevel(5, []);
      expect(level).toBeNull();
    });

    it('should return FIRST for 7-13 days with no previous reminder', () => {
      const level = service.determineSuggestedLevel(10, []);
      expect(level).toBe('FIRST');
    });

    it('should return SECOND for 14-29 days with FIRST already sent', () => {
      const level = service.determineSuggestedLevel(20, ['FIRST']);
      expect(level).toBe('SECOND');
    });

    it('should return FINAL for 30+ days with SECOND already sent', () => {
      const level = service.determineSuggestedLevel(35, ['FIRST', 'SECOND']);
      expect(level).toBe('FINAL');
    });

    it('should return null if current level already sent', () => {
      const level = service.determineSuggestedLevel(10, ['FIRST']);
      expect(level).toBeNull();
    });
  });
});
