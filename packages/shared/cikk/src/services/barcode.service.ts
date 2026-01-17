import { Injectable } from '@nestjs/common';
import {
  BarcodeType,
  BARCODE_PATTERNS,
  type ScanLookupResult,
} from '../interfaces/barcode.interface';

/**
 * BarcodeService - EAN-13 and Code128 barcode validation, generation, and scan lookup
 * Story 8-1: Cikk CRUD - AC4: Vonalkód Kezelés
 * Story 8-4: Vonalkód és QR Kód Kezelés
 *
 * EAN-13 format:
 * - 13 digits total
 * - First 12 digits: data
 * - Last digit: check digit
 *
 * Code128 format:
 * - Variable-length alphanumeric
 * - ASCII 0-127 characters
 * - Max 128 characters
 *
 * Check digit algorithm:
 * 1. Sum digits at odd positions (1, 3, 5, 7, 9, 11) × 1
 * 2. Sum digits at even positions (2, 4, 6, 8, 10, 12) × 3
 * 3. Add the sums
 * 4. Check digit = (10 - (sum mod 10)) mod 10
 *
 * @kgc/cikk
 */
@Injectable()
export class BarcodeService {
  constructor(private readonly prisma: any) {} // PrismaService

  // =========================================
  // EAN-13 METHODS (Story 8-1)
  // =========================================

  /**
   * Validate EAN-13 barcode
   *
   * @param barcode - Barcode string to validate
   * @returns True if valid EAN-13, false otherwise
   */
  validateEAN13(barcode: string): boolean {
    // Handle null/undefined/empty
    if (!barcode) {
      return false;
    }

    // Must be exactly 13 digits
    if (!BARCODE_PATTERNS.EAN13.test(barcode)) {
      return false;
    }

    // Extract digits and check digit
    const digits = barcode.split('').map(Number);
    const providedCheckDigit = digits.pop()!;

    // Calculate expected check digit
    const expectedCheckDigit = this.calculateCheckDigitFromDigits(digits);

    return providedCheckDigit === expectedCheckDigit;
  }

  /**
   * Calculate EAN-13 check digit from first 12 digits
   *
   * @param first12Digits - First 12 digits as string
   * @returns Check digit (0-9)
   */
  calculateCheckDigit(first12Digits: string): number {
    if (first12Digits.length !== 12) {
      throw new Error('First 12 digits required');
    }

    const digits = first12Digits.split('').map(Number);
    return this.calculateCheckDigitFromDigits(digits);
  }

  /**
   * Internal check digit calculation from digit array
   */
  private calculateCheckDigitFromDigits(digits: number[]): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      // Odd positions (0, 2, 4...) multiply by 1
      // Even positions (1, 3, 5...) multiply by 3
      const digit = digits[i];
      if (digit === undefined) continue;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    return (10 - (sum % 10)) % 10;
  }

  /**
   * Generate a unique EAN-13 barcode
   *
   * @param prefix - Country/company prefix (e.g., '590' for Poland, '599' for Hungary)
   * @param tenantId - Tenant context
   * @returns Generated unique EAN-13 barcode
   */
  async generateEAN13(prefix: string, tenantId: string): Promise<string> {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random middle part
      const randomPart = Math.floor(Math.random() * 1e9)
        .toString()
        .padStart(9, '0');

      // First 12 digits = prefix + random (trimmed to fit)
      const first12 = (prefix + randomPart).substring(0, 12);

      // Calculate check digit
      const checkDigit = this.calculateCheckDigit(first12);

      // Complete barcode
      const barcode = first12 + checkDigit;

      // Check uniqueness
      const isUnique = await this.isUnique(barcode, tenantId);
      if (isUnique) {
        return barcode;
      }
    }

    throw new Error('Nem sikerült egyedi vonalkódot generálni');
  }

  // =========================================
  // CODE128 METHODS (Story 8-4)
  // =========================================

  /**
   * Validate Code128 barcode
   * Code128 accepts ASCII 0-127 characters, max 128 characters
   *
   * @param barcode - Barcode string to validate
   * @returns True if valid Code128, false otherwise
   */
  validateCode128(barcode: string): boolean {
    if (!barcode) {
      return false;
    }

    // Max 128 characters
    if (barcode.length > 128) {
      return false;
    }

    // Must contain only ASCII printable characters (0-127)
    return BARCODE_PATTERNS.CODE128.test(barcode);
  }

  /**
   * Validate K-P-D location code format
   * Format: K{num}-P{num}-D{num} (e.g., K2-P5-D3)
   *
   * @param code - Location code to validate
   * @returns True if valid K-P-D format
   */
  validateKPDCode(code: string): boolean {
    if (!code) {
      return false;
    }

    return BARCODE_PATTERNS.KPD_LOCATION.test(code);
  }

  /**
   * Validate item code format
   * Format: PRD|PRT|SVC-YYYYMMDD-XXXX
   *
   * @param code - Item code to validate
   * @returns True if valid item code format
   */
  validateItemCode(code: string): boolean {
    if (!code) {
      return false;
    }

    return BARCODE_PATTERNS.ITEM_CODE.test(code);
  }

  // =========================================
  // BARCODE TYPE DETECTION (Story 8-4)
  // =========================================

  /**
   * Detect the type of barcode from the scanned string
   *
   * @param data - Scanned barcode data
   * @returns Detected barcode type
   */
  detectBarcodeType(data: string): BarcodeType | 'unknown' {
    if (!data) {
      return 'unknown';
    }

    // Check if it's a valid EAN-13
    if (this.validateEAN13(data)) {
      return BarcodeType.EAN13;
    }

    // Check if it's JSON (QR code data)
    if (this.isJsonString(data)) {
      return BarcodeType.QR;
    }

    // Check if it's a valid Code128
    if (this.validateCode128(data)) {
      return BarcodeType.CODE128;
    }

    return 'unknown';
  }

  /**
   * Check if string is valid JSON
   */
  private isJsonString(str: string): boolean {
    try {
      const parsed = JSON.parse(str);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }

  // =========================================
  // SCAN LOOKUP (Story 8-4)
  // =========================================

  /**
   * Look up an item by scanned barcode/QR code
   * Detects barcode type and searches for matching item
   *
   * @param data - Scanned barcode or QR data
   * @param tenantId - Tenant context
   * @returns Scan lookup result with item data if found
   */
  async scanLookup(data: string, tenantId: string): Promise<ScanLookupResult> {
    const barcodeType = this.detectBarcodeType(data);

    // Parse QR data if detected
    let qrData: Record<string, unknown> | null = null;
    if (barcodeType === BarcodeType.QR) {
      try {
        qrData = JSON.parse(data) as Record<string, unknown>;
      } catch {
        qrData = null;
      }
    }

    // Search for item by barcode or QR data
    let item = null;

    if (qrData && qrData.id) {
      // If QR data has an ID, search by ID
      item = await this.prisma.item.findFirst({
        where: {
          tenantId,
          id: qrData.id as string,
        },
        select: {
          id: true,
          code: true,
          name: true,
          barcode: true,
          itemType: true,
          status: true,
        },
      });
    } else {
      // Search by barcode (primary or alternative)
      item = await this.findByBarcode(data, tenantId);
    }

    const result: ScanLookupResult = {
      found: item !== null,
      barcodeType,
      data,
    };
    if (item !== null && item !== undefined) {
      result.item = item;
    }
    if (qrData !== null && qrData !== undefined) {
      result.qrData = qrData;
    }
    return result;
  }

  // =========================================
  // UNIQUENESS CHECKS
  // =========================================

  /**
   * Check if barcode is unique within tenant
   *
   * @param barcode - Barcode to check
   * @param tenantId - Tenant context
   * @param excludeItemId - Item ID to exclude (for updates)
   * @returns True if unique, false if exists
   */
  async isUnique(barcode: string, tenantId: string, excludeItemId?: string): Promise<boolean> {
    const where: Record<string, unknown> = {
      tenantId,
      OR: [{ barcode }, { alternativeBarcodes: { has: barcode } }],
    };

    if (excludeItemId) {
      where.id = { not: excludeItemId };
    }

    const existing = await this.prisma.item.findFirst({ where });
    return !existing;
  }

  /**
   * Find item by barcode (including alternative barcodes)
   *
   * @param barcode - Barcode to search
   * @param tenantId - Tenant context
   * @returns Item or null
   */
  async findByBarcode(barcode: string, tenantId: string): Promise<unknown | null> {
    return this.prisma.item.findFirst({
      where: {
        tenantId,
        OR: [{ barcode }, { alternativeBarcodes: { has: barcode } }],
      },
      select: {
        id: true,
        code: true,
        name: true,
        barcode: true,
        itemType: true,
        status: true,
      },
    });
  }
}
