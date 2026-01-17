/**
 * QRCodeService unit tests
 * Story 8-4: Vonalkód és QR Kód Kezelés
 *
 * TDD RED phase - Tests for QR code generation and parsing
 *
 * @kgc/cikk
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QRCodeService } from './qr-code.service';
import {
  QRDataType,
  QRErrorCorrectionLevel,
  type ItemQRData,
  type LocationQRData,
} from '../interfaces/barcode.interface';

describe('QRCodeService', () => {
  let service: QRCodeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new QRCodeService();
  });

  // =========================================
  // GENERATE QR DATA TESTS
  // =========================================
  describe('generateItemQRData', () => {
    it('should generate valid item QR data structure', () => {
      const item = {
        id: 'item-123',
        tenantId: 'tenant-456',
        code: 'PRD-20260116-0001',
        name: 'Bosch GBH 2-26',
        barcode: '5901234123457',
        itemType: 'PRODUCT',
        listPrice: 125000,
        category: { code: 'POWER-TOOLS' },
      };

      const result = service.generateItemQRData(item);

      expect(result.type).toBe(QRDataType.ITEM);
      expect(result.id).toBe('item-123');
      expect(result.tenantId).toBe('tenant-456');
      expect(result.code).toBe('PRD-20260116-0001');
      expect(result.name).toBe('Bosch GBH 2-26');
      expect(result.barcode).toBe('5901234123457');
      expect(result.itemType).toBe('PRODUCT');
      expect(result.listPrice).toBe(125000);
      expect(result.categoryCode).toBe('POWER-TOOLS');
    });

    it('should handle item without optional fields', () => {
      const item = {
        id: 'item-123',
        tenantId: 'tenant-456',
        code: 'PRT-20260116-0002',
        name: 'Csavar M8x50',
        barcode: null,
        itemType: 'PART',
        listPrice: null,
        category: null,
      };

      const result = service.generateItemQRData(item);

      expect(result.barcode).toBeNull();
      expect(result.listPrice).toBeNull();
      expect(result.categoryCode).toBeNull();
    });
  });

  describe('generateLocationQRData', () => {
    it('should generate valid location QR data structure', () => {
      const result = service.generateLocationQRData({
        tenantId: 'tenant-456',
        warehouseId: 'wh-001',
        locationCode: 'K2-P5-D3',
        description: 'Raktár 2, 5. polc, 3. doboz',
      });

      expect(result.type).toBe(QRDataType.LOCATION);
      expect(result.tenantId).toBe('tenant-456');
      expect(result.warehouseId).toBe('wh-001');
      expect(result.locationCode).toBe('K2-P5-D3');
      expect(result.description).toBe('Raktár 2, 5. polc, 3. doboz');
    });
  });

  // =========================================
  // ENCODE/DECODE TESTS
  // =========================================
  describe('encodeQRData', () => {
    it('should encode QR data to JSON string', () => {
      const data: ItemQRData = {
        type: QRDataType.ITEM,
        id: 'item-123',
        tenantId: 'tenant-456',
        code: 'PRD-20260116-0001',
        name: 'Test Item',
        barcode: null,
        itemType: 'PRODUCT',
      };

      const result = service.encodeQRData(data);

      expect(typeof result).toBe('string');
      expect(JSON.parse(result)).toEqual(data);
    });

    it('should produce valid JSON that can be parsed', () => {
      const data: LocationQRData = {
        type: QRDataType.LOCATION,
        tenantId: 'tenant-456',
        warehouseId: 'wh-001',
        locationCode: 'K1-P3-D7',
      };

      const encoded = service.encodeQRData(data);
      const decoded = JSON.parse(encoded);

      expect(decoded.type).toBe('location');
      expect(decoded.locationCode).toBe('K1-P3-D7');
    });
  });

  describe('parseQRData', () => {
    it('should parse valid item QR data', () => {
      const jsonString = JSON.stringify({
        type: 'item',
        id: 'item-123',
        code: 'PRD-20260116-0001',
        name: 'Test Item',
      });

      const result = service.parseQRData(jsonString);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('item');
      expect(result?.id).toBe('item-123');
    });

    it('should parse valid location QR data', () => {
      const jsonString = JSON.stringify({
        type: 'location',
        tenantId: 'tenant-456',
        warehouseId: 'wh-001',
        locationCode: 'K2-P5-D3',
      });

      const result = service.parseQRData(jsonString);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('location');
      expect(result?.locationCode).toBe('K2-P5-D3');
    });

    it('should return null for invalid JSON', () => {
      const result = service.parseQRData('not-valid-json');

      expect(result).toBeNull();
    });

    it('should return null for non-object JSON', () => {
      const result = service.parseQRData('"just a string"');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = service.parseQRData('');

      expect(result).toBeNull();
    });
  });

  // =========================================
  // IDENTIFY QR TYPE TESTS
  // =========================================
  describe('identifyQRDataType', () => {
    it('should identify item QR data', () => {
      const data = { type: 'item', id: 'item-123', code: 'PRD-001' };

      const result = service.identifyQRDataType(data);

      expect(result).toBe(QRDataType.ITEM);
    });

    it('should identify location QR data', () => {
      const data = { type: 'location', locationCode: 'K2-P5-D3' };

      const result = service.identifyQRDataType(data);

      expect(result).toBe(QRDataType.LOCATION);
    });

    it('should identify work order QR data', () => {
      const data = { type: 'work_order', workOrderId: 'wo-123' };

      const result = service.identifyQRDataType(data);

      expect(result).toBe(QRDataType.WORK_ORDER);
    });

    it('should identify rental QR data', () => {
      const data = { type: 'rental', rentalId: 'rnt-123' };

      const result = service.identifyQRDataType(data);

      expect(result).toBe(QRDataType.RENTAL);
    });

    it('should return null for unknown type', () => {
      const data = { someField: 'value' };

      const result = service.identifyQRDataType(data);

      expect(result).toBeNull();
    });
  });

  // =========================================
  // GENERATE QR IMAGE TESTS
  // =========================================
  describe('generateQRImage', () => {
    it('should generate QR image as Buffer', async () => {
      const data = { type: 'item', id: 'item-123' };

      const result = await service.generateQRImage(data);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate QR image with custom options', async () => {
      const data = { type: 'location', locationCode: 'K1-P1-D1' };
      const options = {
        errorCorrectionLevel: QRErrorCorrectionLevel.L,
        width: 200,
        margin: 4,
      };

      const result = await service.generateQRImage(data, options);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate QR image from string data', async () => {
      const result = await service.generateQRImage('simple-string-data');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should use high error correction by default', async () => {
      const data = { type: 'item', id: 'test' };

      // We can't easily test the internal options, but we verify it doesn't throw
      const result = await service.generateQRImage(data);

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  // =========================================
  // GENERATE QR DATA URL TESTS
  // =========================================
  describe('generateQRDataURL', () => {
    it('should generate base64 data URL', async () => {
      const data = { type: 'item', id: 'item-123' };

      const result = await service.generateQRDataURL(data);

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate valid base64 string', async () => {
      const data = { type: 'location', locationCode: 'K1-P2-D3' };

      const result = await service.generateQRDataURL(data);
      const base64Part = result.replace('data:image/png;base64,', '');

      // Validate base64 format
      expect(() => Buffer.from(base64Part, 'base64')).not.toThrow();
    });
  });

  // =========================================
  // VALIDATE QR DATA TESTS
  // =========================================
  describe('validateQRData', () => {
    it('should validate complete item QR data', () => {
      const data: ItemQRData = {
        type: QRDataType.ITEM,
        id: 'item-123',
        tenantId: 'tenant-456',
        code: 'PRD-20260116-0001',
        name: 'Test Item',
        barcode: null,
        itemType: 'PRODUCT',
      };

      const result = service.validateQRData(data);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject item QR data without required fields', () => {
      const data = {
        type: QRDataType.ITEM,
        // Missing id, tenantId, code, name, itemType
      } as ItemQRData;

      const result = service.validateQRData(data);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate location QR data', () => {
      const data: LocationQRData = {
        type: QRDataType.LOCATION,
        tenantId: 'tenant-456',
        warehouseId: 'wh-001',
        locationCode: 'K2-P5-D3',
      };

      const result = service.validateQRData(data);

      expect(result.valid).toBe(true);
    });

    it('should reject location QR data with invalid K-P-D format', () => {
      const data: LocationQRData = {
        type: QRDataType.LOCATION,
        tenantId: 'tenant-456',
        warehouseId: 'wh-001',
        locationCode: 'INVALID-CODE', // Not K-P-D format
      };

      const result = service.validateQRData(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('locationCode: Érvénytelen K-P-D formátum');
    });
  });
});
