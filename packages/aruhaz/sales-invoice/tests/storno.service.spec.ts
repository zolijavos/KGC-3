/**
 * Storno Service Tests
 * Story 10-5: Sztornó Számla
 * TDD RED Phase - Tests written BEFORE implementation
 * @package @kgc/sales-invoice
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { StornoService, IStornoRepository } from '../src/services/storno.service';
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
    status: 'ISSUED' as InvoiceStatus,
    partnerId: 'partner-1',
    partnerName: 'Test Partner Kft.',
    partnerTaxNumber: '12345678-2-42',
    partnerAddress: '1234 Budapest, Test utca 1.',
    invoiceDate: new Date('2024-01-15'),
    fulfillmentDate: new Date('2024-01-15'),
    dueDate: new Date('2024-01-23'),
    paymentMethod: 'TRANSFER',
    netAmount: 100000,
    vatAmount: 27000,
    grossAmount: 127000,
    paidAmount: 0,
    currency: 'HUF',
    isConfidential: false,
    visibleToRoles: [],
    items: [
      {
        lineNumber: 1,
        description: 'Test tétel',
        quantity: 10,
        unit: 'db',
        unitPriceNet: 10000,
        vatRate: 'RATE_27',
        vatPercentage: 27,
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
      },
    ],
    createdAt: new Date(),
    createdBy: 'user-1',
    updatedAt: new Date(),
    ...overrides,
  };
}

// Mock repository
function createMockRepository(): IStornoRepository {
  const invoices = new Map<string, IInvoice>();
  let idCounter = 1;

  return {
    findById: vi.fn(async (id: string) => invoices.get(id) ?? null),
    create: vi.fn(async (data: Omit<IInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<IInvoice> => {
      const id = `storno-${idCounter++}`;
      const now = new Date();
      const invoice: IInvoice = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      };
      invoices.set(id, invoice);
      return invoice;
    }),
    update: vi.fn(async (id: string, data: Partial<IInvoice>): Promise<IInvoice> => {
      const existing = invoices.get(id);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      invoices.set(id, updated);
      return updated;
    }),
    getNextSequenceNumber: vi.fn(async () => 1),
    setInvoice: (invoice: IInvoice) => invoices.set(invoice.id, invoice),
  };
}

describe('StornoService', () => {
  let service: StornoService;
  let repository: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    repository = createMockRepository();
    service = new StornoService(repository);
  });

  describe('createStorno', () => {
    it('létrehoz egy sztornó számlát', async () => {
      const original = createSampleInvoice({ status: 'ISSUED' });
      repository.setInvoice(original);

      const result = await service.createStorno(original.id, 'user-1', 'Téves kiállítás');

      expect(result.type).toBe('STORNO');
      expect(result.prefix).toBe('STO');
      expect(result.referencedInvoiceId).toBe(original.id);
    });

    it('sztornó számla negatív összegekkel', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        netAmount: 100000,
        vatAmount: 27000,
        grossAmount: 127000,
      });
      repository.setInvoice(original);

      const result = await service.createStorno(original.id, 'user-1', 'Téves kiállítás');

      expect(result.netAmount).toBe(-100000);
      expect(result.vatAmount).toBe(-27000);
      expect(result.grossAmount).toBe(-127000);
    });

    it('sztornó tételek negatív mennyiséggel', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        items: [
          {
            lineNumber: 1,
            description: 'Termék',
            quantity: 5,
            unit: 'db',
            unitPriceNet: 10000,
            vatRate: 'RATE_27',
            vatPercentage: 27,
            netAmount: 50000,
            vatAmount: 13500,
            grossAmount: 63500,
          },
        ],
      });
      repository.setInvoice(original);

      const result = await service.createStorno(original.id, 'user-1', 'Indok');

      expect(result.items[0]?.quantity).toBe(-5);
      expect(result.items[0]?.netAmount).toBe(-50000);
      expect(result.items[0]?.vatAmount).toBe(-13500);
      expect(result.items[0]?.grossAmount).toBe(-63500);
    });

    it('csak ISSUED státuszú számla sztornózható', async () => {
      const draft = createSampleInvoice({ status: 'DRAFT' });
      repository.setInvoice(draft);

      await expect(
        service.createStorno(draft.id, 'user-1', 'Indok')
      ).rejects.toThrow(BadRequestException);
    });

    it('SENT státuszú számla is sztornózható', async () => {
      const sent = createSampleInvoice({ status: 'SENT' });
      repository.setInvoice(sent);

      const result = await service.createStorno(sent.id, 'user-1', 'Indok');
      expect(result.type).toBe('STORNO');
    });

    it('PAID státuszú számla is sztornózható', async () => {
      const paid = createSampleInvoice({ status: 'PAID', paidAmount: 127000 });
      repository.setInvoice(paid);

      const result = await service.createStorno(paid.id, 'user-1', 'Indok');
      expect(result.type).toBe('STORNO');
    });

    it('CANCELLED számla NEM sztornózható', async () => {
      const cancelled = createSampleInvoice({ status: 'CANCELLED' });
      repository.setInvoice(cancelled);

      await expect(
        service.createStorno(cancelled.id, 'user-1', 'Indok')
      ).rejects.toThrow(BadRequestException);
    });

    it('már sztornózott számla NEM sztornózható újra', async () => {
      const storno = createSampleInvoice({ type: 'STORNO', status: 'ISSUED' });
      repository.setInvoice(storno);

      await expect(
        service.createStorno(storno.id, 'user-1', 'Indok')
      ).rejects.toThrow(BadRequestException);
    });

    it('kötelező az indoklás', async () => {
      const original = createSampleInvoice({ status: 'ISSUED' });
      repository.setInvoice(original);

      await expect(
        service.createStorno(original.id, 'user-1', '')
      ).rejects.toThrow(BadRequestException);
    });

    it('whitespace indoklás nem elfogadható', async () => {
      const original = createSampleInvoice({ status: 'ISSUED' });
      repository.setInvoice(original);

      await expect(
        service.createStorno(original.id, 'user-1', '   ')
      ).rejects.toThrow(BadRequestException);
    });

    it('örökli a partner adatokat', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        partnerId: 'partner-test',
        partnerName: 'Partner Név',
        partnerTaxNumber: '11111111-1-11',
        partnerAddress: 'Cím 123',
      });
      repository.setInvoice(original);

      const result = await service.createStorno(original.id, 'user-1', 'Indok');

      expect(result.partnerId).toBe('partner-test');
      expect(result.partnerName).toBe('Partner Név');
      expect(result.partnerTaxNumber).toBe('11111111-1-11');
      expect(result.partnerAddress).toBe('Cím 123');
    });

    it('sztornó számla DRAFT státuszban jön létre', async () => {
      const original = createSampleInvoice({ status: 'ISSUED' });
      repository.setInvoice(original);

      const result = await service.createStorno(original.id, 'user-1', 'Indok');

      expect(result.status).toBe('DRAFT');
    });

    it('megjegyzésben szerepel az eredeti számlaszám', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        invoiceNumber: 'KGC-2024-00042',
      });
      repository.setInvoice(original);

      const result = await service.createStorno(original.id, 'user-1', 'Téves kiállítás');

      expect(result.notes).toContain('KGC-2024-00042');
      expect(result.notes).toContain('Téves kiállítás');
    });

    it('teljesítési dátum az aktuális nap', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        fulfillmentDate: new Date('2024-01-01'),
      });
      repository.setInvoice(original);

      const now = new Date();
      const result = await service.createStorno(original.id, 'user-1', 'Indok');

      expect(result.fulfillmentDate.toDateString()).toBe(now.toDateString());
    });

    it('fizetési határidő az aktuális nap', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        dueDate: new Date('2024-01-15'),
      });
      repository.setInvoice(original);

      const now = new Date();
      const result = await service.createStorno(original.id, 'user-1', 'Indok');

      expect(result.dueDate.toDateString()).toBe(now.toDateString());
    });

    it('currency öröklődik', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        currency: 'EUR',
      });
      repository.setInvoice(original);

      const result = await service.createStorno(original.id, 'user-1', 'Indok');
      expect(result.currency).toBe('EUR');
    });
  });

  describe('canStorno', () => {
    it('true ISSUED számlánál', () => {
      expect(service.canStorno('ISSUED', 'STANDARD')).toBe(true);
    });

    it('true SENT számlánál', () => {
      expect(service.canStorno('SENT', 'STANDARD')).toBe(true);
    });

    it('true PAID számlánál', () => {
      expect(service.canStorno('PAID', 'STANDARD')).toBe(true);
    });

    it('true PARTIALLY_PAID számlánál', () => {
      expect(service.canStorno('PARTIALLY_PAID', 'STANDARD')).toBe(true);
    });

    it('true OVERDUE számlánál', () => {
      expect(service.canStorno('OVERDUE', 'STANDARD')).toBe(true);
    });

    it('false DRAFT számlánál', () => {
      expect(service.canStorno('DRAFT', 'STANDARD')).toBe(false);
    });

    it('false CANCELLED számlánál', () => {
      expect(service.canStorno('CANCELLED', 'STANDARD')).toBe(false);
    });

    it('false STORNO típusú számlánál', () => {
      expect(service.canStorno('ISSUED', 'STORNO')).toBe(false);
    });

    it('false PROFORMA számlánál', () => {
      expect(service.canStorno('ISSUED', 'PROFORMA')).toBe(false);
    });
  });

  describe('részleges sztornó', () => {
    it('részleges sztornó megadott tételekkel', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        items: [
          {
            lineNumber: 1,
            description: 'Tétel 1',
            quantity: 10,
            unit: 'db',
            unitPriceNet: 1000,
            vatRate: 'RATE_27',
            vatPercentage: 27,
            netAmount: 10000,
            vatAmount: 2700,
            grossAmount: 12700,
          },
          {
            lineNumber: 2,
            description: 'Tétel 2',
            quantity: 5,
            unit: 'db',
            unitPriceNet: 2000,
            vatRate: 'RATE_27',
            vatPercentage: 27,
            netAmount: 10000,
            vatAmount: 2700,
            grossAmount: 12700,
          },
        ],
        netAmount: 20000,
        vatAmount: 5400,
        grossAmount: 25400,
      });
      repository.setInvoice(original);

      const result = await service.createPartialStorno(original.id, 'user-1', 'Részleges visszáru', [
        { lineNumber: 1, quantity: 3 }, // 3 db a 10-ből
      ]);

      expect(result.items.length).toBe(1);
      expect(result.items[0]?.quantity).toBe(-3);
      expect(result.items[0]?.netAmount).toBe(-3000);
    });

    it('részleges sztornó nem lépheti túl az eredeti mennyiséget', async () => {
      const original = createSampleInvoice({
        status: 'ISSUED',
        items: [
          {
            lineNumber: 1,
            description: 'Tétel 1',
            quantity: 5,
            unit: 'db',
            unitPriceNet: 1000,
            vatRate: 'RATE_27',
            vatPercentage: 27,
            netAmount: 5000,
            vatAmount: 1350,
            grossAmount: 6350,
          },
        ],
      });
      repository.setInvoice(original);

      await expect(
        service.createPartialStorno(original.id, 'user-1', 'Indok', [
          { lineNumber: 1, quantity: 10 }, // Több mint az eredeti
        ])
      ).rejects.toThrow(BadRequestException);
    });
  });
});
