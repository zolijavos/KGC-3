import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarcodeType } from '../interfaces/barcode.interface';
import { BarcodeService } from './barcode.service';

/**
 * TDD Tests for BarcodeService
 * Story 8-1: Cikk CRUD - AC4: Vonalkód Kezelés
 * Story 8-4: Vonalkód és QR Kód Kezelés (Code128, scan lookup)
 *
 * EAN-13 format:
 * - 13 digits
 * - Last digit is check digit
 * - Check digit algorithm: sum of odd positions * 1 + even positions * 3, mod 10
 *
 * Code128 format:
 * - Variable length alphanumeric
 * - ASCII 0-127 characters
 *
 * @kgc/cikk
 */

// Valid UUIDs for testing
const TENANT_ID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const ITEM_ID = 'b2c3d4e5-f6a7-4901-8cde-f12345678901';

// Mock PrismaService
const mockPrismaService = {
  item: {
    findFirst: vi.fn(),
  },
};

// Valid EAN-13 barcodes for testing
const VALID_BARCODES = [
  '5901234123457', // Example valid EAN-13
  '4006381333931', // Bosch product
  '8710103917083', // Philips product
  '0012345678905', // US/Canada UPC-A compatible
];

// Invalid EAN-13 barcodes - reserved for negative test cases
const _INVALID_BARCODES = [
  '5901234123456', // Wrong check digit (should be 7)
  '1234567890123', // Wrong check digit
  '590123412345', // Only 12 digits
  '59012341234578', // 14 digits
  'ABC1234123457', // Contains letters
  '', // Empty string
];

describe('BarcodeService', () => {
  let barcodeService: BarcodeService;

  beforeEach(() => {
    vi.clearAllMocks();
    barcodeService = new BarcodeService(mockPrismaService as any);
  });

  // =========================================
  // VALIDATE EAN-13 TESTS (6 tesztek)
  // =========================================
  describe('validateEAN13()', () => {
    it('should return true for valid EAN-13 barcode', () => {
      expect(barcodeService.validateEAN13('5901234123457')).toBe(true);
    });

    it('should validate multiple valid EAN-13 barcodes', () => {
      for (const barcode of VALID_BARCODES) {
        expect(barcodeService.validateEAN13(barcode)).toBe(true);
      }
    });

    it('should return false for wrong check digit', () => {
      expect(barcodeService.validateEAN13('5901234123456')).toBe(false);
    });

    it('should return false for non-13 digit barcode', () => {
      expect(barcodeService.validateEAN13('590123412345')).toBe(false); // 12 digits
      expect(barcodeService.validateEAN13('59012341234578')).toBe(false); // 14 digits
    });

    it('should return false for barcode with letters', () => {
      expect(barcodeService.validateEAN13('ABC1234123457')).toBe(false);
    });

    it('should return false for empty or null input', () => {
      expect(barcodeService.validateEAN13('')).toBe(false);
      expect(barcodeService.validateEAN13(null as any)).toBe(false);
      expect(barcodeService.validateEAN13(undefined as any)).toBe(false);
    });
  });

  // =========================================
  // CALCULATE CHECK DIGIT TESTS (4 tesztek)
  // =========================================
  describe('calculateCheckDigit()', () => {
    it('should calculate correct check digit', () => {
      // For 590123412345, check digit should be 7
      expect(barcodeService.calculateCheckDigit('590123412345')).toBe(7);
    });

    it('should calculate check digit for various prefixes', () => {
      // 400638133393 -> check digit 1
      expect(barcodeService.calculateCheckDigit('400638133393')).toBe(1);
      // 871010391708 -> check digit 3
      expect(barcodeService.calculateCheckDigit('871010391708')).toBe(3);
    });

    it('should throw error for input shorter than 12 digits', () => {
      expect(() => barcodeService.calculateCheckDigit('12345')).toThrow('First 12 digits required');
    });

    it('should throw error for input longer than 12 digits', () => {
      expect(() => barcodeService.calculateCheckDigit('1234567890123')).toThrow(
        'First 12 digits required'
      );
    });
  });

  // =========================================
  // IS UNIQUE TESTS (3 tesztek)
  // =========================================
  describe('isUnique()', () => {
    it('should return true if barcode does not exist in tenant', async () => {
      mockPrismaService.item.findFirst.mockResolvedValue(null);

      const result = await barcodeService.isUnique('5901234123457', TENANT_ID);

      expect(result).toBe(true);
      expect(mockPrismaService.item.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          OR: [{ barcode: '5901234123457' }, { alternativeBarcodes: { has: '5901234123457' } }],
        },
      });
    });

    it('should return false if barcode already exists in tenant', async () => {
      mockPrismaService.item.findFirst.mockResolvedValue({ id: 'existing-id' });

      const result = await barcodeService.isUnique('5901234123457', TENANT_ID);

      expect(result).toBe(false);
    });

    it('should exclude specific item when checking uniqueness (for updates)', async () => {
      mockPrismaService.item.findFirst.mockResolvedValue(null);

      await barcodeService.isUnique('5901234123457', TENANT_ID, ITEM_ID);

      expect(mockPrismaService.item.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          id: { not: ITEM_ID },
          OR: [{ barcode: '5901234123457' }, { alternativeBarcodes: { has: '5901234123457' } }],
        },
      });
    });
  });

  // =========================================
  // GENERATE EAN-13 TEST (2 tesztek)
  // =========================================
  describe('generateEAN13()', () => {
    it('should generate valid EAN-13 with tenant prefix', async () => {
      // Mock to always return unique
      mockPrismaService.item.findFirst.mockResolvedValue(null);

      const barcode = await barcodeService.generateEAN13('590', TENANT_ID);

      // Should be 13 digits
      expect(barcode).toHaveLength(13);
      // Should start with prefix
      expect(barcode.startsWith('590')).toBe(true);
      // Should be valid EAN-13
      expect(barcodeService.validateEAN13(barcode)).toBe(true);
    });

    it('should throw error after max attempts if no unique barcode found', async () => {
      // Mock to always return existing (never unique)
      mockPrismaService.item.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(barcodeService.generateEAN13('590', TENANT_ID)).rejects.toThrow(
        'Nem sikerült egyedi vonalkódot generálni'
      );

      // Should have tried 100 times
      expect(mockPrismaService.item.findFirst).toHaveBeenCalledTimes(100);
    });
  });

  // =========================================
  // STORY 8-4: CODE128 VALIDATION TESTS
  // =========================================
  describe('validateCode128()', () => {
    it('should return true for valid alphanumeric Code128', () => {
      expect(barcodeService.validateCode128('PRD-20260116-0001')).toBe(true);
      expect(barcodeService.validateCode128('ABC123')).toBe(true);
      expect(barcodeService.validateCode128('K2-P5-D3')).toBe(true);
    });

    it('should return true for Code128 with special characters', () => {
      expect(barcodeService.validateCode128('test-code_123')).toBe(true);
      expect(barcodeService.validateCode128('item/sub/code')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(barcodeService.validateCode128('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(barcodeService.validateCode128(null as any)).toBe(false);
      expect(barcodeService.validateCode128(undefined as any)).toBe(false);
    });

    it('should return false for string exceeding max length (128 chars)', () => {
      const longString = 'a'.repeat(129);
      expect(barcodeService.validateCode128(longString)).toBe(false);
    });

    it('should return true for string at max length (128 chars)', () => {
      const maxString = 'a'.repeat(128);
      expect(barcodeService.validateCode128(maxString)).toBe(true);
    });
  });

  // =========================================
  // STORY 8-4: DETECT BARCODE TYPE TESTS
  // =========================================
  describe('detectBarcodeType()', () => {
    it('should detect EAN-13 barcode', () => {
      expect(barcodeService.detectBarcodeType('5901234123457')).toBe(BarcodeType.EAN13);
    });

    it('should detect Code128 for item codes', () => {
      expect(barcodeService.detectBarcodeType('PRD-20260116-0001')).toBe(BarcodeType.CODE128);
      expect(barcodeService.detectBarcodeType('PRT-20260116-0002')).toBe(BarcodeType.CODE128);
    });

    it('should detect Code128 for K-P-D location codes', () => {
      expect(barcodeService.detectBarcodeType('K2-P5-D3')).toBe(BarcodeType.CODE128);
    });

    it('should return unknown for invalid barcodes', () => {
      expect(barcodeService.detectBarcodeType('')).toBe('unknown');
      expect(barcodeService.detectBarcodeType(null as any)).toBe('unknown');
    });

    it('should detect QR for JSON strings', () => {
      const qrJson = JSON.stringify({ type: 'item', id: 'item-123' });
      expect(barcodeService.detectBarcodeType(qrJson)).toBe(BarcodeType.QR);
    });

    it('should fallback to Code128 for alphanumeric strings', () => {
      expect(barcodeService.detectBarcodeType('GENERIC-CODE-123')).toBe(BarcodeType.CODE128);
    });
  });

  // =========================================
  // STORY 8-4: SCAN LOOKUP TESTS
  // =========================================
  describe('scanLookup()', () => {
    it('should find item by primary barcode (EAN-13)', async () => {
      const mockItem = {
        id: 'item-123',
        code: 'PRD-20260116-0001',
        name: 'Bosch GBH 2-26',
        barcode: '5901234123457',
        itemType: 'PRODUCT',
        status: 'ACTIVE',
      };
      mockPrismaService.item.findFirst.mockResolvedValue(mockItem);

      const result = await barcodeService.scanLookup('5901234123457', TENANT_ID);

      expect(result.found).toBe(true);
      expect(result.barcodeType).toBe(BarcodeType.EAN13);
      expect(result.item).toEqual(mockItem);
    });

    it('should find item by alternative barcode', async () => {
      const mockItem = {
        id: 'item-456',
        code: 'PRT-20260116-0002',
        name: 'Csavar M8',
        barcode: null,
        alternativeBarcodes: ['ALT-CODE-123'],
        itemType: 'PART',
        status: 'ACTIVE',
      };
      mockPrismaService.item.findFirst.mockResolvedValue(mockItem);

      const result = await barcodeService.scanLookup('ALT-CODE-123', TENANT_ID);

      expect(result.found).toBe(true);
      expect(result.barcodeType).toBe(BarcodeType.CODE128);
    });

    it('should return not found for unknown barcode', async () => {
      mockPrismaService.item.findFirst.mockResolvedValue(null);

      const result = await barcodeService.scanLookup('UNKNOWN-CODE', TENANT_ID);

      expect(result.found).toBe(false);
      expect(result.item).toBeNull();
    });

    it('should detect and parse QR code data', async () => {
      mockPrismaService.item.findFirst.mockResolvedValue(null);

      const qrJson = JSON.stringify({ type: 'item', id: 'item-123', code: 'PRD-001' });
      const result = await barcodeService.scanLookup(qrJson, TENANT_ID);

      expect(result.barcodeType).toBe(BarcodeType.QR);
      expect(result.qrData).not.toBeNull();
      expect(result.qrData?.type).toBe('item');
    });

    it('should return item data for matched QR code', async () => {
      const mockItem = {
        id: 'item-123',
        code: 'PRD-20260116-0001',
        name: 'Test Item',
        barcode: null,
        itemType: 'PRODUCT',
        status: 'ACTIVE',
      };
      mockPrismaService.item.findFirst.mockResolvedValue(mockItem);

      const qrJson = JSON.stringify({ type: 'item', id: 'item-123' });
      const result = await barcodeService.scanLookup(qrJson, TENANT_ID);

      expect(result.found).toBe(true);
      expect(result.item?.id).toBe('item-123');
    });
  });

  // =========================================
  // STORY 8-4: VALIDATE K-P-D LOCATION CODE
  // =========================================
  describe('validateKPDCode()', () => {
    it('should validate correct K-P-D format', () => {
      expect(barcodeService.validateKPDCode('K1-P1-D1')).toBe(true);
      expect(barcodeService.validateKPDCode('K2-P5-D3')).toBe(true);
      expect(barcodeService.validateKPDCode('K10-P20-D30')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(barcodeService.validateKPDCode('k2-p5-d3')).toBe(true);
      expect(barcodeService.validateKPDCode('K2-p5-D3')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(barcodeService.validateKPDCode('K1-P1')).toBe(false); // Missing D
      expect(barcodeService.validateKPDCode('1-2-3')).toBe(false); // Missing K-P-D
      expect(barcodeService.validateKPDCode('K-P-D')).toBe(false); // Missing numbers
      expect(barcodeService.validateKPDCode('')).toBe(false);
    });
  });

  // =========================================
  // STORY 8-4: VALIDATE ITEM CODE FORMAT
  // =========================================
  describe('validateItemCode()', () => {
    it('should validate correct item code format', () => {
      expect(barcodeService.validateItemCode('PRD-20260116-0001')).toBe(true);
      expect(barcodeService.validateItemCode('PRT-20260115-0002')).toBe(true);
      expect(barcodeService.validateItemCode('SVC-20260114-0003')).toBe(true);
    });

    it('should reject invalid prefixes', () => {
      expect(barcodeService.validateItemCode('XXX-20260116-0001')).toBe(false);
      expect(barcodeService.validateItemCode('ABC-20260116-0001')).toBe(false);
    });

    it('should reject invalid date format', () => {
      expect(barcodeService.validateItemCode('PRD-2026011-0001')).toBe(false); // 7 digits
      expect(barcodeService.validateItemCode('PRD-202601161-0001')).toBe(false); // 9 digits
    });

    it('should reject invalid sequence format', () => {
      expect(barcodeService.validateItemCode('PRD-20260116-001')).toBe(false); // 3 digits
      expect(barcodeService.validateItemCode('PRD-20260116-00001')).toBe(false); // 5 digits
    });
  });
});
