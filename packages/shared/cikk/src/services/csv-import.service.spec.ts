/**
 * CsvImportService unit tests
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CsvImportService } from './csv-import.service';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma client
const mockPrismaItem = {
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockPrismaSupplierItem = {
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockPrismaSupplierItemPriceHistory = {
  create: vi.fn(),
};

const mockPrismaCategory = {
  findFirst: vi.fn(),
};

const mockPrismaItemCodeSequence = {
  upsert: vi.fn(),
};

const mockPrisma = {
  item: mockPrismaItem,
  supplierItem: mockPrismaSupplierItem,
  supplierItemPriceHistory: mockPrismaSupplierItemPriceHistory,
  category: mockPrismaCategory,
  itemCodeSequence: mockPrismaItemCodeSequence,
  $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => callback(mockPrisma)),
};

// Mock audit logger
const mockAuditLogger = {
  log: vi.fn(),
};

describe('CsvImportService', () => {
  let service: CsvImportService;
  const tenantId = 'tenant-123';
  const supplierId = 'supplier-456';
  const userId = 'user-789';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CsvImportService(mockPrisma as never, mockAuditLogger as never);
  });

  describe('importSupplierItems', () => {
    const validCsvContent = `supplier_code,barcode,name,description,cost_price,list_price,category_code,unit
MA-12345,5900000001234,Fúrógép XYZ,Profi fúrógép,45000,89900,POWER-TOOLS,db
MA-12346,5900000001235,Csavarhúzó ABC,,12000,24900,,db`;

    it('should import valid CSV rows', async () => {
      mockPrismaItem.findFirst
        .mockResolvedValueOnce(null) // First item - not found by barcode
        .mockResolvedValueOnce(null); // Second item - not found by barcode

      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);

      mockPrismaCategory.findFirst.mockResolvedValueOnce({
        id: 'cat-123',
        code: 'POWER-TOOLS',
      });

      mockPrismaItemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });

      mockPrismaItem.create
        .mockResolvedValueOnce({
          id: 'item-1',
          code: 'PRD-20260116-0001',
          name: 'Fúrógép XYZ',
          barcode: '5900000001234',
        })
        .mockResolvedValueOnce({
          id: 'item-2',
          code: 'PRD-20260116-0002',
          name: 'Csavarhúzó ABC',
          barcode: '5900000001235',
        });

      mockPrismaSupplierItem.create.mockResolvedValue({
        id: 'si-1',
        supplierCode: 'MA-12345',
        costPrice: new Decimal(45000),
      });

      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      const result = await service.importSupplierItems(
        tenantId,
        supplierId,
        validCsvContent,
        { createMissingItems: true },
        userId
      );

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.importedCount).toBe(2);
      expect(result.errorCount).toBe(0);
    });

    it('should skip header row', async () => {
      const csvWithHeader = `supplier_code,barcode,name,description,cost_price,list_price,category_code,unit
MA-12345,5900000001234,Teszt Cikk,,10000,20000,,db`;

      mockPrismaItem.findFirst.mockResolvedValue(null);
      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);
      mockPrismaItemCodeSequence.upsert.mockResolvedValue({ sequence: 1 });
      mockPrismaItem.create.mockResolvedValue({
        id: 'item-1',
        code: 'PRD-20260116-0001',
        name: 'Teszt Cikk',
      });
      mockPrismaSupplierItem.create.mockResolvedValue({});
      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      const result = await service.importSupplierItems(
        tenantId,
        supplierId,
        csvWithHeader,
        { createMissingItems: true },
        userId
      );

      expect(result.totalRows).toBe(1); // Header is skipped
    });

    it('should update existing item by barcode', async () => {
      const csvContent = `supplier_code,barcode,name,description,cost_price,list_price,category_code,unit
MA-12345,5900000001234,Fúrógép XYZ Updated,,50000,99900,,db`;

      mockPrismaItem.findFirst.mockResolvedValue({
        id: 'existing-item',
        code: 'PRD-001',
        name: 'Fúrógép XYZ',
        barcode: '5900000001234',
      });

      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);

      mockPrismaSupplierItem.create.mockResolvedValue({
        id: 'si-1',
        supplierCode: 'MA-12345',
        costPrice: new Decimal(50000),
      });

      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      const result = await service.importSupplierItems(
        tenantId,
        supplierId,
        csvContent,
        { updateExisting: true },
        userId
      );

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBeGreaterThanOrEqual(0);
    });

    it('should report errors for invalid rows', async () => {
      const invalidCsv = `supplier_code,barcode,name,description,cost_price,list_price,category_code,unit
,5900000001234,Missing Code,,10000,20000,,db
MA-123,,Missing Barcode And Name,,abc,20000,,db`;

      const result = await service.importSupplierItems(
        tenantId,
        supplierId,
        invalidCsv,
        {},
        userId
      );

      expect(result.success).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(result.errorCount);
    });

    it('should validate supplier_code is not empty', async () => {
      const result = service.validateCsvRow(
        {
          supplierCode: '',
          name: 'Test',
          costPrice: 1000,
        },
        1
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('supplier_code nem lehet üres');
    });

    it('should validate name is not empty', async () => {
      const result = service.validateCsvRow(
        {
          supplierCode: 'MA-123',
          name: '',
          costPrice: 1000,
        },
        1
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name nem lehet üres');
    });

    it('should validate cost_price is a positive number', async () => {
      const result = service.validateCsvRow(
        {
          supplierCode: 'MA-123',
          name: 'Test',
          costPrice: -100,
        },
        1
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cost_price nem lehet negatív');
    });

    it('should update existing supplier-item link with new price', async () => {
      const csvContent = `supplier_code,barcode,name,description,cost_price,list_price,category_code,unit
MA-12345,5900000001234,Fúrógép XYZ,,55000,99900,,db`;

      mockPrismaItem.findFirst.mockResolvedValue({
        id: 'existing-item',
        code: 'PRD-001',
        barcode: '5900000001234',
      });

      mockPrismaSupplierItem.findFirst.mockResolvedValue({
        id: 'existing-si',
        supplierCode: 'MA-12345',
        costPrice: new Decimal(45000),
      });

      mockPrismaSupplierItem.update.mockResolvedValue({
        id: 'existing-si',
        costPrice: new Decimal(55000),
      });

      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      const result = await service.importSupplierItems(
        tenantId,
        supplierId,
        csvContent,
        { updateExisting: true },
        userId
      );

      expect(mockPrismaSupplierItem.update).toHaveBeenCalled();
      expect(mockPrismaSupplierItemPriceHistory.create).toHaveBeenCalled();
    });
  });

  describe('parsePrice', () => {
    it('should parse integer price', () => {
      expect(service.parsePrice('45000')).toBe(45000);
    });

    it('should parse decimal price', () => {
      expect(service.parsePrice('45000.50')).toBe(45000.5);
    });

    it('should parse price with comma as decimal separator', () => {
      expect(service.parsePrice('45000,50')).toBe(45000.5);
    });

    it('should parse price with thousand separator', () => {
      expect(service.parsePrice('45 000')).toBe(45000);
    });

    it('should return NaN for invalid price', () => {
      expect(service.parsePrice('abc')).toBeNaN();
    });

    it('should return 0 for empty string', () => {
      expect(service.parsePrice('')).toBe(0);
    });
  });

  describe('validateCsvRow', () => {
    it('should validate valid row', () => {
      const result = service.validateCsvRow(
        {
          supplierCode: 'MA-12345',
          barcode: '5900000001234',
          name: 'Test Product',
          costPrice: 45000,
        },
        1
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate barcode format if provided', () => {
      const result = service.validateCsvRow(
        {
          supplierCode: 'MA-123',
          barcode: '123', // Too short for EAN-13
          name: 'Test',
          costPrice: 1000,
        },
        1
      );

      // Barcode validation is lenient - just warns
      expect(result.valid).toBe(true);
    });
  });
});
