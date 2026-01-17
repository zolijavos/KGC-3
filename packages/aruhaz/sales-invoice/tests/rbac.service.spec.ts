/**
 * Invoice RBAC Service Tests
 * Story 10-6: Számla Láthatóság RBAC
 * TDD RED Phase - Tests written BEFORE implementation
 * @package @kgc/sales-invoice
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { InvoiceRbacService } from '../src/services/rbac.service';
import type { IInvoice } from '../src/interfaces/invoice.interface';
import type { InvoiceStatus } from '../src/services/invoice-status';

// Helper to create a sample invoice
function createSampleInvoice(overrides: Partial<IInvoice> = {}): IInvoice {
  return {
    id: 'inv-1',
    tenantId: 'tenant-1',
    invoiceNumber: 'KGC-2024-00001',
    prefix: 'KGC',
    sequenceNumber: 1,
    type: 'STANDARD',
    status: 'DRAFT' as InvoiceStatus,
    partnerId: 'partner-1',
    partnerName: 'Test Partner Kft.',
    partnerAddress: '1234 Budapest, Test utca 1.',
    invoiceDate: new Date(),
    fulfillmentDate: new Date(),
    dueDate: new Date(),
    paymentMethod: 'TRANSFER',
    netAmount: 100000,
    vatAmount: 27000,
    grossAmount: 127000,
    paidAmount: 0,
    currency: 'HUF',
    isConfidential: false,
    visibleToRoles: [],
    items: [],
    createdAt: new Date(),
    createdBy: 'user-1',
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('InvoiceRbacService', () => {
  let service: InvoiceRbacService;

  beforeEach(() => {
    service = new InvoiceRbacService();
  });

  describe('canView', () => {
    describe('nem confidential számlák', () => {
      it('bárki láthatja a nem confidential számlát', () => {
        const invoice = createSampleInvoice({ isConfidential: false });
        expect(service.canView(invoice, ['SALES'])).toBe(true);
        expect(service.canView(invoice, ['WAREHOUSE'])).toBe(true);
        expect(service.canView(invoice, [])).toBe(true);
      });
    });

    describe('confidential számlák', () => {
      it('ADMIN mindig látja', () => {
        const invoice = createSampleInvoice({
          isConfidential: true,
          visibleToRoles: ['FINANCE'],
        });
        expect(service.canView(invoice, ['ADMIN'])).toBe(true);
      });

      it('SUPER_ADMIN mindig látja', () => {
        const invoice = createSampleInvoice({
          isConfidential: true,
          visibleToRoles: ['FINANCE'],
        });
        expect(service.canView(invoice, ['SUPER_ADMIN'])).toBe(true);
      });

      it('visibleToRoles-ban szereplő role látja', () => {
        const invoice = createSampleInvoice({
          isConfidential: true,
          visibleToRoles: ['FINANCE', 'MANAGER'],
        });

        expect(service.canView(invoice, ['FINANCE'])).toBe(true);
        expect(service.canView(invoice, ['MANAGER'])).toBe(true);
        expect(service.canView(invoice, ['FINANCE', 'SALES'])).toBe(true);
      });

      it('visibleToRoles-ban NEM szereplő role nem látja', () => {
        const invoice = createSampleInvoice({
          isConfidential: true,
          visibleToRoles: ['FINANCE', 'MANAGER'],
        });

        expect(service.canView(invoice, ['SALES'])).toBe(false);
        expect(service.canView(invoice, ['WAREHOUSE'])).toBe(false);
        expect(service.canView(invoice, [])).toBe(false);
      });

      it('üres visibleToRoles esetén csak ADMIN/SUPER_ADMIN látja', () => {
        const invoice = createSampleInvoice({
          isConfidential: true,
          visibleToRoles: [],
        });

        expect(service.canView(invoice, ['ADMIN'])).toBe(true);
        expect(service.canView(invoice, ['SUPER_ADMIN'])).toBe(true);
        expect(service.canView(invoice, ['FINANCE'])).toBe(false);
        expect(service.canView(invoice, ['MANAGER'])).toBe(false);
      });
    });
  });

  describe('canEdit', () => {
    it('DRAFT státuszban bárki szerkesztheti akinek van jogosultsága megtekinteni', () => {
      const invoice = createSampleInvoice({ status: 'DRAFT', isConfidential: false });

      expect(service.canEdit(invoice, ['SALES'])).toBe(true);
      expect(service.canEdit(invoice, ['FINANCE'])).toBe(true);
    });

    it('nem DRAFT státuszban senki sem szerkesztheti', () => {
      const invoice = createSampleInvoice({ status: 'ISSUED', isConfidential: false });

      expect(service.canEdit(invoice, ['SALES'])).toBe(false);
      expect(service.canEdit(invoice, ['ADMIN'])).toBe(false);
    });

    it('confidential DRAFT csak megfelelő role-al szerkeszthető', () => {
      const invoice = createSampleInvoice({
        status: 'DRAFT',
        isConfidential: true,
        visibleToRoles: ['FINANCE'],
      });

      expect(service.canEdit(invoice, ['FINANCE'])).toBe(true);
      expect(service.canEdit(invoice, ['SALES'])).toBe(false);
      expect(service.canEdit(invoice, ['ADMIN'])).toBe(true);
    });
  });

  describe('canDelete', () => {
    it('DRAFT státuszban törölhető megfelelő jogosultsággal', () => {
      const invoice = createSampleInvoice({ status: 'DRAFT', isConfidential: false });

      expect(service.canDelete(invoice, ['SALES'])).toBe(true);
      expect(service.canDelete(invoice, ['ADMIN'])).toBe(true);
    });

    it('nem DRAFT státuszban nem törölhető', () => {
      const invoice = createSampleInvoice({ status: 'ISSUED', isConfidential: false });

      expect(service.canDelete(invoice, ['ADMIN'])).toBe(false);
      expect(service.canDelete(invoice, ['SUPER_ADMIN'])).toBe(false);
    });

    it('confidential DRAFT csak megfelelő role-al törölhető', () => {
      const invoice = createSampleInvoice({
        status: 'DRAFT',
        isConfidential: true,
        visibleToRoles: ['FINANCE'],
      });

      expect(service.canDelete(invoice, ['FINANCE'])).toBe(true);
      expect(service.canDelete(invoice, ['SALES'])).toBe(false);
    });
  });

  describe('canIssue', () => {
    it('DRAFT státuszú számla kiállítható FINANCE vagy ADMIN role-al', () => {
      const invoice = createSampleInvoice({ status: 'DRAFT' });

      expect(service.canIssue(invoice, ['FINANCE'])).toBe(true);
      expect(service.canIssue(invoice, ['ADMIN'])).toBe(true);
      expect(service.canIssue(invoice, ['MANAGER', 'FINANCE'])).toBe(true);
    });

    it('DRAFT státuszú számla NEM kiállítható SALES role-al', () => {
      const invoice = createSampleInvoice({ status: 'DRAFT' });

      expect(service.canIssue(invoice, ['SALES'])).toBe(false);
      expect(service.canIssue(invoice, ['WAREHOUSE'])).toBe(false);
    });

    it('nem DRAFT státuszú számla nem kiállítható', () => {
      const invoice = createSampleInvoice({ status: 'ISSUED' });

      expect(service.canIssue(invoice, ['ADMIN'])).toBe(false);
      expect(service.canIssue(invoice, ['FINANCE'])).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('ISSUED számla sztornózható FINANCE vagy ADMIN role-al', () => {
      const invoice = createSampleInvoice({ status: 'ISSUED' });

      expect(service.canCancel(invoice, ['FINANCE'])).toBe(true);
      expect(service.canCancel(invoice, ['ADMIN'])).toBe(true);
    });

    it('SENT számla sztornózható', () => {
      const invoice = createSampleInvoice({ status: 'SENT' });

      expect(service.canCancel(invoice, ['FINANCE'])).toBe(true);
    });

    it('PAID számla sztornózható', () => {
      const invoice = createSampleInvoice({ status: 'PAID' });

      expect(service.canCancel(invoice, ['FINANCE'])).toBe(true);
    });

    it('DRAFT számla NEM sztornózható (törlés helyett)', () => {
      const invoice = createSampleInvoice({ status: 'DRAFT' });

      expect(service.canCancel(invoice, ['ADMIN'])).toBe(false);
    });

    it('CANCELLED számla NEM sztornózható újra', () => {
      const invoice = createSampleInvoice({ status: 'CANCELLED' });

      expect(service.canCancel(invoice, ['ADMIN'])).toBe(false);
    });

    it('SALES role nem sztornózhat', () => {
      const invoice = createSampleInvoice({ status: 'ISSUED' });

      expect(service.canCancel(invoice, ['SALES'])).toBe(false);
    });
  });

  describe('canRecordPayment', () => {
    it('SENT státuszú számlánál rögzíthető fizetés', () => {
      const invoice = createSampleInvoice({ status: 'SENT' });

      expect(service.canRecordPayment(invoice, ['FINANCE'])).toBe(true);
      expect(service.canRecordPayment(invoice, ['CASHIER'])).toBe(true);
    });

    it('ISSUED státuszú számlánál rögzíthető fizetés', () => {
      const invoice = createSampleInvoice({ status: 'ISSUED' });

      expect(service.canRecordPayment(invoice, ['FINANCE'])).toBe(true);
    });

    it('PARTIALLY_PAID státuszú számlánál rögzíthető fizetés', () => {
      const invoice = createSampleInvoice({ status: 'PARTIALLY_PAID' });

      expect(service.canRecordPayment(invoice, ['FINANCE'])).toBe(true);
    });

    it('OVERDUE státuszú számlánál rögzíthető fizetés', () => {
      const invoice = createSampleInvoice({ status: 'OVERDUE' });

      expect(service.canRecordPayment(invoice, ['FINANCE'])).toBe(true);
    });

    it('DRAFT státuszú számlánál NEM rögzíthető fizetés', () => {
      const invoice = createSampleInvoice({ status: 'DRAFT' });

      expect(service.canRecordPayment(invoice, ['FINANCE'])).toBe(false);
    });

    it('PAID státuszú számlánál NEM rögzíthető fizetés', () => {
      const invoice = createSampleInvoice({ status: 'PAID' });

      expect(service.canRecordPayment(invoice, ['FINANCE'])).toBe(false);
    });

    it('CANCELLED státuszú számlánál NEM rögzíthető fizetés', () => {
      const invoice = createSampleInvoice({ status: 'CANCELLED' });

      expect(service.canRecordPayment(invoice, ['FINANCE'])).toBe(false);
    });

    it('SALES role nem rögzíthet fizetést', () => {
      const invoice = createSampleInvoice({ status: 'SENT' });

      expect(service.canRecordPayment(invoice, ['SALES'])).toBe(false);
    });
  });

  describe('filterByVisibility', () => {
    it('szűri a confidential számlákat', () => {
      const invoices = [
        createSampleInvoice({ id: '1', isConfidential: false }),
        createSampleInvoice({ id: '2', isConfidential: true, visibleToRoles: ['FINANCE'] }),
        createSampleInvoice({ id: '3', isConfidential: true, visibleToRoles: ['MANAGER'] }),
      ];

      const result = service.filterByVisibility(invoices, ['SALES']);
      expect(result.map((i) => i.id)).toEqual(['1']);
    });

    it('ADMIN látja az összes számlát', () => {
      const invoices = [
        createSampleInvoice({ id: '1', isConfidential: false }),
        createSampleInvoice({ id: '2', isConfidential: true, visibleToRoles: ['FINANCE'] }),
        createSampleInvoice({ id: '3', isConfidential: true, visibleToRoles: [] }),
      ];

      const result = service.filterByVisibility(invoices, ['ADMIN']);
      expect(result.length).toBe(3);
    });

    it('FINANCE látja a hozzá tartozó confidential számlákat', () => {
      const invoices = [
        createSampleInvoice({ id: '1', isConfidential: false }),
        createSampleInvoice({ id: '2', isConfidential: true, visibleToRoles: ['FINANCE'] }),
        createSampleInvoice({ id: '3', isConfidential: true, visibleToRoles: ['MANAGER'] }),
      ];

      const result = service.filterByVisibility(invoices, ['FINANCE']);
      expect(result.map((i) => i.id)).toEqual(['1', '2']);
    });
  });

  describe('assertCanView', () => {
    it('nem dob hibát ha megtekinthető', () => {
      const invoice = createSampleInvoice({ isConfidential: false });
      expect(() => service.assertCanView(invoice, ['SALES'])).not.toThrow();
    });

    it('ForbiddenException ha nem tekinthető meg', () => {
      const invoice = createSampleInvoice({
        isConfidential: true,
        visibleToRoles: ['FINANCE'],
      });
      expect(() => service.assertCanView(invoice, ['SALES'])).toThrow(ForbiddenException);
    });
  });

  describe('assertCanEdit', () => {
    it('nem dob hibát ha szerkeszthető', () => {
      const invoice = createSampleInvoice({ status: 'DRAFT', isConfidential: false });
      expect(() => service.assertCanEdit(invoice, ['SALES'])).not.toThrow();
    });

    it('ForbiddenException ha nem szerkeszthető', () => {
      const invoice = createSampleInvoice({ status: 'ISSUED' });
      expect(() => service.assertCanEdit(invoice, ['ADMIN'])).toThrow(ForbiddenException);
    });
  });

  describe('role hierarchia', () => {
    it('több role esetén elegendő ha az egyik megfelel', () => {
      const invoice = createSampleInvoice({
        isConfidential: true,
        visibleToRoles: ['FINANCE'],
      });

      expect(service.canView(invoice, ['SALES', 'FINANCE'])).toBe(true);
      expect(service.canView(invoice, ['WAREHOUSE', 'MANAGER', 'FINANCE'])).toBe(true);
    });
  });
});
