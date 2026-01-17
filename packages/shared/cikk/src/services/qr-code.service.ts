/**
 * QRCodeService - QR Code generation and parsing
 * Story 8-4: Vonalkód és QR Kód Kezelés
 *
 * ADR-022: Hibrid stratégia - QR kód (2D) komplex adatokhoz
 *
 * Features:
 * - Item QR code generation (product details for scan)
 * - Location QR code generation (K-P-D helykód)
 * - QR data validation
 * - QR image generation (PNG)
 * - QR data URL generation (base64 for display)
 *
 * @kgc/cikk
 */

import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import {
  QRDataType,
  QRErrorCorrectionLevel,
  DEFAULT_QR_OPTIONS,
  BARCODE_PATTERNS,
  type ItemQRData,
  type LocationQRData,
  type QRCodeGenerationOptions,
} from '../interfaces/barcode.interface';

/**
 * Item input for QR data generation
 */
interface ItemInput {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  barcode?: string | null;
  itemType: string;
  listPrice?: number | null;
  category?: { code: string } | null;
}

/**
 * Location input for QR data generation
 */
interface LocationInput {
  tenantId: string;
  warehouseId: string;
  locationCode: string;
  description?: string;
}

/**
 * QR data validation result
 */
interface QRValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class QRCodeService {
  /**
   * Generate QR data structure for an item
   */
  generateItemQRData(item: ItemInput): ItemQRData {
    return {
      type: QRDataType.ITEM,
      id: item.id,
      tenantId: item.tenantId,
      code: item.code,
      name: item.name,
      barcode: item.barcode ?? null,
      itemType: item.itemType,
      listPrice: item.listPrice ?? null,
      categoryCode: item.category?.code ?? null,
    };
  }

  /**
   * Generate QR data structure for a location (K-P-D)
   */
  generateLocationQRData(input: LocationInput): LocationQRData {
    const data: LocationQRData = {
      type: QRDataType.LOCATION,
      tenantId: input.tenantId,
      warehouseId: input.warehouseId,
      locationCode: input.locationCode,
    };
    if (input.description !== undefined) {
      data.description = input.description;
    }
    return data;
  }

  /**
   * Encode QR data to JSON string
   */
  encodeQRData(data: ItemQRData | LocationQRData | Record<string, unknown>): string {
    return JSON.stringify(data);
  }

  /**
   * Parse QR data from JSON string
   * Returns null if invalid JSON or not an object
   */
  parseQRData(jsonString: string): Record<string, unknown> | null {
    if (!jsonString || jsonString.trim() === '') {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonString);

      // Must be an object (not array, string, number, etc.)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return null;
      }

      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Identify the type of QR data from parsed object
   */
  identifyQRDataType(data: Record<string, unknown>): QRDataType | null {
    const type = data.type as string | undefined;

    switch (type) {
      case 'item':
        return QRDataType.ITEM;
      case 'location':
        return QRDataType.LOCATION;
      case 'work_order':
        return QRDataType.WORK_ORDER;
      case 'rental':
        return QRDataType.RENTAL;
      default:
        return null;
    }
  }

  /**
   * Generate QR code image as Buffer (PNG)
   */
  async generateQRImage(
    data: Record<string, unknown> | string,
    options?: QRCodeGenerationOptions
  ): Promise<Buffer> {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };

    const qrOptions: QRCode.QRCodeToBufferOptions = {
      errorCorrectionLevel: this.mapErrorCorrectionLevel(mergedOptions.errorCorrectionLevel),
      type: 'png',
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    };

    return QRCode.toBuffer(jsonData, qrOptions);
  }

  /**
   * Generate QR code as base64 data URL (for display in HTML/img tags)
   */
  async generateQRDataURL(
    data: Record<string, unknown> | string,
    options?: QRCodeGenerationOptions
  ): Promise<string> {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };

    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: this.mapErrorCorrectionLevel(mergedOptions.errorCorrectionLevel),
      type: 'image/png',
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      color: mergedOptions.color,
    };

    return QRCode.toDataURL(jsonData, qrOptions);
  }

  /**
   * Validate QR data structure
   */
  validateQRData(data: ItemQRData | LocationQRData): QRValidationResult {
    const errors: string[] = [];

    if (data.type === QRDataType.ITEM) {
      const itemData = data as ItemQRData;

      if (!itemData.id) {
        errors.push('id: Kötelező mező');
      }
      if (!itemData.tenantId) {
        errors.push('tenantId: Kötelező mező');
      }
      if (!itemData.code) {
        errors.push('code: Kötelező mező');
      }
      if (!itemData.name) {
        errors.push('name: Kötelező mező');
      }
      if (!itemData.itemType) {
        errors.push('itemType: Kötelező mező');
      }
    } else if (data.type === QRDataType.LOCATION) {
      const locationData = data as LocationQRData;

      if (!locationData.tenantId) {
        errors.push('tenantId: Kötelező mező');
      }
      if (!locationData.warehouseId) {
        errors.push('warehouseId: Kötelező mező');
      }
      if (!locationData.locationCode) {
        errors.push('locationCode: Kötelező mező');
      } else if (!BARCODE_PATTERNS.KPD_LOCATION.test(locationData.locationCode)) {
        errors.push('locationCode: Érvénytelen K-P-D formátum');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Map error correction level enum to qrcode library format
   */
  private mapErrorCorrectionLevel(
    level?: QRErrorCorrectionLevel
  ): QRCode.QRCodeErrorCorrectionLevel {
    switch (level) {
      case QRErrorCorrectionLevel.L:
        return 'L';
      case QRErrorCorrectionLevel.M:
        return 'M';
      case QRErrorCorrectionLevel.Q:
        return 'Q';
      case QRErrorCorrectionLevel.H:
      default:
        return 'H';
    }
  }
}
