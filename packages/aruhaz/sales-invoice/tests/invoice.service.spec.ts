/**
 * Invoice Service Tests
 * Story 10-1: Számla CRUD
 * TDD - Testing service operations
 * @package @kgc/sales-invoice
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceService, IInvoiceRepository } from '../src/services/invoice.service';
import type { IInvoice, CreateInvoiceInput, InvoiceFilterOptions, PaginationOptions, PaginatedResult } from '../src/interfaces/invoice.interface';
import type { InvoiceStatus } from '../src/services/invoice-status';

// Mock repository implementation
function createMockRepository(): IInvoiceRepository {
  const invoices = new Map<string, IInvoice>();
  let idCounter = 1;

  return {
    findById: vi.fn(async (id: string) => invoices.get(id) ?? null),
    findByNumber: vi.fn(async (tenantId: string, invoiceNumber: string) => {
      return Array.from(invoices.values()).find(
        (i) => i.tenantId === tenantId && i.invoiceNumber === invoiceNumber
      ) ?? null;
    }),
    findMany: vi.fn(async (filter: InvoiceFilterOptions, pagination: PaginationOptions): Promise<PaginatedResult<IInvoice>> => {
      const items = Array.from(invoices.values()).filter((i) => i.tenantId === filter.tenantId);
      return {
        items: items.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize),
        total: items.length,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(items.length / pagination.pageSize),
      };
    }),
    create: vi.fn(async (data: Omit<IInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<IInvoice> => {
      const id = `inv-${idCounter++}`;
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
    delete: vi.fn(async (id: string): Promise<void> => {
      invoices.delete(id);
    }),
    getNextSequenceNumber: vi.fn(async () => 1),
  };
}

// Sample create input
function createSampleInput(overrides: Partial<CreateInvoiceInput> = {}): CreateInvoiceInput {
  return {
    tenantId: 'tenant-1',
    partnerId: 'partner-1',
    partnerName: 'Test Partner Kft.',
    partnerTaxNumber: '12345678-2-42',
    partnerAddress: '1234 Budapest, Test utca 1.',
    paymentMethod: 'TRANSFER',
    items: [
      {
        description: 'Test tétel',
        quantity: 2,
        unit: 'db',
        unitPriceNet: 10000,
        vatRate: 'RATE_27',
      },
    ],
    createdBy: 'user-1',
    ...overrides,
  };
}

describe('InvoiceService', () => {
  let service: InvoiceService;
  let repository: IInvoiceRepository;

  beforeEach(() => {
    repository = createMockRepository();
    service = new InvoiceService(repository);
  });

  describe('create', () => {
    it('létrehoz egy számlát és visszaadja', async () => {
      const input = createSampleInput();
      const result = await service.create(input);

      expect(result.id).toBeDefined();
      expect(result.tenantId).toBe('tenant-1');
      expect(result.partnerId).toBe('partner-1');
      expect(result.status).toBe('DRAFT');
      expect(result.invoiceNumber).toMatch(/^KGC-\d{4}-\d{5}$/);
    });

    it('kiszámolja a tételek összegeit', async () => {
      const input = createSampleInput({
        items: [
          {
            description: 'Tétel 1',
            quantity: 2,
            unit: 'db',
            unitPriceNet: 10000,
            vatRate: 'RATE_27',
          },
        ],
      });

      const result = await service.create(input);

      expect(result.items[0]?.netAmount).toBe(20000);
      expect(result.items[0]?.vatAmount).toBe(5400);
      expect(result.items[0]?.grossAmount).toBe(25400);
    });

    it('kiszámolja az összesített értékeket', async () => {
      const input = createSampleInput({
        items: [
          { description: 'Tétel 1', quantity: 1, unit: 'db', unitPriceNet: 10000, vatRate: 'RATE_27' },
          { description: 'Tétel 2', quantity: 2, unit: 'db', unitPriceNet: 5000, vatRate: 'RATE_27' },
        ],
      });

      const result = await service.create(input);

      // 10000 + 2*5000 = 20000 net
      expect(result.netAmount).toBe(20000);
      // 20000 * 0.27 = 5400
      expect(result.vatAmount).toBe(5400);
      // 20000 + 5400 = 25400
      expect(result.grossAmount).toBe(25400);
    });

    it('prefix típus szerint változik', async () => {
      const proformaInput = createSampleInput({ type: 'PROFORMA' });
      const proformaResult = await service.create(proformaInput);
      expect(proformaResult.invoiceNumber).toMatch(/^PRO-/);

      const correctionInput = createSampleInput({ type: 'CORRECTION' });
      vi.mocked(repository.getNextSequenceNumber).mockResolvedValueOnce(2);
      const correctionResult = await service.create(correctionInput);
      expect(correctionResult.invoiceNumber).toMatch(/^KOR-/);
    });

    it('kedvezmény számítás', async () => {
      const input = createSampleInput({
        items: [
          {
            description: 'Kedvezményes tétel',
            quantity: 1,
            unit: 'db',
            unitPriceNet: 10000,
            vatRate: 'RATE_27',
            discountPercent: 10,
          },
        ],
      });

      const result = await service.create(input);

      // 10000 - 10% = 9000 net
      expect(result.items[0]?.netAmount).toBe(9000);
      expect(result.items[0]?.discountAmount).toBe(1000);
    });

    it('fizetési határidő automatikus számítása átutaláshoz', async () => {
      const now = new Date();
      const input = createSampleInput({ paymentMethod: 'TRANSFER', invoiceDate: now });
      const result = await service.create(input);

      const expectedDue = new Date(now);
      expectedDue.setDate(expectedDue.getDate() + 8);
      expect(result.dueDate.toDateString()).toBe(expectedDue.toDateString());
    });

    it('fizetési határidő készpénznél azonnali', async () => {
      const now = new Date();
      const input = createSampleInput({ paymentMethod: 'CASH', invoiceDate: now });
      const result = await service.create(input);

      expect(result.dueDate.toDateString()).toBe(now.toDateString());
    });

    it('sorszámozás éven belül', async () => {
      vi.mocked(repository.getNextSequenceNumber).mockResolvedValueOnce(42);
      const input = createSampleInput();
      const result = await service.create(input);

      expect(result.sequenceNumber).toBe(42);
      expect(result.invoiceNumber).toContain('-00042');
    });
  });

  describe('findById', () => {
    it('visszaadja a számlát ID alapján', async () => {
      const input = createSampleInput();
      const created = await service.create(input);

      const result = await service.findById(created.id);
      expect(result.id).toBe(created.id);
    });

    it('NotFoundException ha nem létezik', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByNumber', () => {
    it('visszaadja a számlát számlaszám alapján', async () => {
      const input = createSampleInput();
      const created = await service.create(input);

      const result = await service.findByNumber('tenant-1', created.invoiceNumber);
      expect(result.invoiceNumber).toBe(created.invoiceNumber);
    });

    it('NotFoundException ha nem létezik', async () => {
      await expect(service.findByNumber('tenant-1', 'KGC-2024-99999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMany', () => {
    it('visszaadja a lapozott listát', async () => {
      await service.create(createSampleInput());
      await service.create(createSampleInput());

      const result = await service.findMany(
        { tenantId: 'tenant-1' },
        { page: 1, pageSize: 10 }
      );

      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
    });
  });

  describe('update', () => {
    it('frissíti a DRAFT számlát', async () => {
      const created = await service.create(createSampleInput());

      const result = await service.update(created.id, {
        notes: 'Frissített megjegyzés',
        updatedBy: 'user-2',
      });

      expect(result.notes).toBe('Frissített megjegyzés');
    });

    it('BadRequestException ha nem DRAFT', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');

      await expect(
        service.update(created.id, { notes: 'Test', updatedBy: 'user-1' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('törli a DRAFT számlát', async () => {
      const created = await service.create(createSampleInput());
      await service.delete(created.id);

      await expect(service.findById(created.id)).rejects.toThrow(NotFoundException);
    });

    it('BadRequestException ha nem DRAFT', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');

      await expect(service.delete(created.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeStatus', () => {
    it('státusz váltás DRAFT -> ISSUED', async () => {
      const created = await service.create(createSampleInput());
      const result = await service.changeStatus(created.id, 'ISSUED', 'user-1');

      expect(result.status).toBe('ISSUED');
    });

    it('státusz váltás ISSUED -> SENT', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');

      const result = await service.changeStatus(created.id, 'SENT', 'user-1');
      expect(result.status).toBe('SENT');
    });

    it('hiba érvénytelen átmenetnél', async () => {
      const created = await service.create(createSampleInput());

      await expect(
        service.changeStatus(created.id, 'PAID', 'user-1')
      ).rejects.toThrow();
    });

    it('PAID státusznál beállítja a paidAt és paidAmount mezőket', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');
      await service.changeStatus(created.id, 'SENT', 'user-1');

      const result = await service.changeStatus(created.id, 'PAID', 'user-1');

      expect(result.status).toBe('PAID');
      expect(result.paidAt).toBeDefined();
      expect(result.paidAmount).toBe(result.grossAmount);
    });

    it('CANCELLED státusznál beállítja a cancellation mezőket', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');

      const result = await service.changeStatus(created.id, 'CANCELLED', 'user-1', 'Téves kiállítás');

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelledAt).toBeDefined();
      expect(result.cancelledBy).toBe('user-1');
      expect(result.cancellationReason).toBe('Téves kiállítás');
    });
  });

  describe('issue', () => {
    it('kiállítja a számlát (DRAFT -> ISSUED)', async () => {
      const created = await service.create(createSampleInput());
      const result = await service.issue(created.id, 'user-1');

      expect(result.status).toBe('ISSUED');
    });
  });

  describe('cancel', () => {
    it('sztornózza a számlát indoklással', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');

      const result = await service.cancel(created.id, 'user-1', 'Téves kiállítás');

      expect(result.status).toBe('CANCELLED');
      expect(result.cancellationReason).toBe('Téves kiállítás');
    });

    it('BadRequestException ha nincs indoklás', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');

      await expect(service.cancel(created.id, 'user-1', '')).rejects.toThrow(BadRequestException);
    });

    it('BadRequestException ha csak whitespace az indoklás', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');

      await expect(service.cancel(created.id, 'user-1', '   ')).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordPayment', () => {
    it('rögzíti a fizetést és részlegesen fizetett státuszra vált', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');
      await service.changeStatus(created.id, 'SENT', 'user-1');

      const result = await service.recordPayment(created.id, 10000, 'user-1', 'BANK-001');

      expect(result.status).toBe('PARTIALLY_PAID');
      expect(result.paidAmount).toBe(10000);
      expect(result.paymentReference).toBe('BANK-001');
    });

    it('teljes fizetésnél PAID státuszra vált', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');
      await service.changeStatus(created.id, 'SENT', 'user-1');

      const result = await service.recordPayment(created.id, created.grossAmount, 'user-1');

      expect(result.status).toBe('PAID');
      expect(result.paidAt).toBeDefined();
    });

    it('többszöri fizetés összesítése', async () => {
      const created = await service.create(createSampleInput());
      await service.issue(created.id, 'user-1');
      await service.changeStatus(created.id, 'SENT', 'user-1');

      await service.recordPayment(created.id, 10000, 'user-1');
      const result = await service.recordPayment(created.id, created.grossAmount - 10000, 'user-1');

      expect(result.status).toBe('PAID');
      expect(result.paidAmount).toBe(created.grossAmount);
    });

    it('hiba nem megfelelő státusznál', async () => {
      const created = await service.create(createSampleInput());

      await expect(
        service.recordPayment(created.id, 10000, 'user-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Számla típusok', () => {
    it.each([
      ['STANDARD', 'KGC'],
      ['PROFORMA', 'PRO'],
      ['CORRECTION', 'KOR'],
      ['STORNO', 'STO'],
      ['ADVANCE', 'ELO'],
      ['FINAL', 'VEG'],
    ] as const)('%s típusú számla %s prefixszel', async (type, expectedPrefix) => {
      const input = createSampleInput({ type });
      const result = await service.create(input);

      expect(result.prefix).toBe(expectedPrefix);
      expect(result.invoiceNumber).toMatch(new RegExp(`^${expectedPrefix}-`));
    });
  });

  describe('ÁFA kulcsok kezelése', () => {
    it.each([
      ['RATE_27', 27],
      ['RATE_18', 18],
      ['RATE_5', 5],
      ['RATE_0', 0],
      ['AAM', 0],
      ['TAM', 0],
    ] as const)('%s ÁFA kulcs %d%%-kal számol', async (vatRate, percentage) => {
      const input = createSampleInput({
        items: [
          { description: 'Test', quantity: 1, unit: 'db', unitPriceNet: 10000, vatRate },
        ],
      });

      const result = await service.create(input);
      const expectedVat = (10000 * percentage) / 100;

      expect(result.items[0]?.vatPercentage).toBe(percentage);
      expect(result.items[0]?.vatAmount).toBe(expectedVat);
    });
  });

  describe('Confidential számla', () => {
    it('isConfidential flag beállítása', async () => {
      const input = createSampleInput({
        isConfidential: true,
        visibleToRoles: ['ADMIN', 'FINANCE'],
      });

      const result = await service.create(input);

      expect(result.isConfidential).toBe(true);
      expect(result.visibleToRoles).toEqual(['ADMIN', 'FINANCE']);
    });

    it('alapértelmezetten nem confidential', async () => {
      const input = createSampleInput();
      const result = await service.create(input);

      expect(result.isConfidential).toBe(false);
      expect(result.visibleToRoles).toEqual([]);
    });
  });
});
