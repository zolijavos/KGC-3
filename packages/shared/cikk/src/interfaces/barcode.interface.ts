/**
 * Barcode and QR Code Interfaces
 * Story 8-4: Vonalkód és QR Kód Kezelés
 *
 * ADR-022: Hibrid stratégia - Vonalkód (1D) termékekhez + QR kód (2D) komplex adatokhoz
 *
 * @kgc/cikk
 */

/**
 * Barcode types supported by the system
 */
export enum BarcodeType {
  EAN13 = 'EAN13', // 13-digit EAN barcode (default for products)
  CODE128 = 'CODE128', // Variable-length alphanumeric (SKU, location codes)
  QR = 'QR', // QR code for complex data
}

/**
 * QR code data types
 */
export enum QRDataType {
  ITEM = 'item', // Product/Item QR
  LOCATION = 'location', // K-P-D helykód
  WORK_ORDER = 'work_order', // Munkalap
  RENTAL = 'rental', // Bérlési bizonylat
}

/**
 * QR code error correction level
 * Higher = more data recovery, larger QR code
 */
export enum QRErrorCorrectionLevel {
  L = 'L', // ~7% recovery
  M = 'M', // ~15% recovery
  Q = 'Q', // ~25% recovery
  H = 'H', // ~30% recovery (recommended for labels)
}

/**
 * Options for barcode generation
 */
export interface BarcodeGenerationOptions {
  format?: BarcodeType;
  width?: number;
  height?: number;
  displayValue?: boolean; // Show text below barcode
  fontSize?: number;
  margin?: number;
}

/**
 * Default barcode generation options
 */
export const DEFAULT_BARCODE_OPTIONS: BarcodeGenerationOptions = {
  format: BarcodeType.CODE128,
  width: 2,
  height: 60,
  displayValue: true,
  fontSize: 14,
  margin: 10,
};

/**
 * Options for QR code generation
 */
export interface QRCodeGenerationOptions {
  errorCorrectionLevel?: QRErrorCorrectionLevel;
  width?: number;
  margin?: number;
  color?: {
    dark?: string; // Default: #000000
    light?: string; // Default: #ffffff
  };
}

/**
 * Default QR code generation options
 */
export const DEFAULT_QR_OPTIONS: QRCodeGenerationOptions = {
  errorCorrectionLevel: QRErrorCorrectionLevel.H,
  width: 300,
  margin: 2,
};

/**
 * QR code data structure for items
 */
export interface ItemQRData {
  type: QRDataType.ITEM;
  id: string;
  tenantId: string;
  code: string;
  name: string;
  barcode?: string | null;
  itemType: string;
  listPrice?: number | null;
  categoryCode?: string | null;
}

/**
 * QR code data structure for locations (K-P-D)
 */
export interface LocationQRData {
  type: QRDataType.LOCATION;
  tenantId: string;
  warehouseId: string;
  locationCode: string; // K2-P5-D3 format
  description?: string;
}

/**
 * Result of barcode scan lookup
 */
export interface ScanLookupResult {
  found: boolean;
  barcodeType: BarcodeType | 'unknown';
  data: string;
  item?: {
    id: string;
    code: string;
    name: string;
    barcode: string | null;
    itemType: string;
    status: string;
  } | null;
  qrData?: ItemQRData | LocationQRData | Record<string, unknown> | null;
}

/**
 * Barcode image generation result
 */
export interface BarcodeImageResult {
  format: BarcodeType;
  data: string;
  image: Buffer;
  mimeType: 'image/png' | 'image/svg+xml';
  width: number;
  height: number;
}

/**
 * Supported barcode prefixes for routing
 * ADR-022: Barcode Prefix Routing
 */
export const BARCODE_PREFIX_ROUTING: Record<string, string> = {
  PRD: '/api/v1/items', // Product items
  PRT: '/api/v1/items', // Part items
  SVC: '/api/v1/items', // Service items
  'K-': '/api/v1/locations', // K-P-D location codes
  WO: '/api/v1/work-orders', // Work order codes
  RNT: '/api/v1/rentals', // Rental codes
};

/**
 * Regex patterns for barcode validation
 */
export const BARCODE_PATTERNS = {
  EAN13: /^\d{13}$/,
  // eslint-disable-next-line no-control-regex
  CODE128: /^[\x00-\x7F]{1,128}$/, // ASCII characters (0-127)
  KPD_LOCATION: /^K\d+-P\d+-D\d+$/i, // K2-P5-D3 format
  ITEM_CODE: /^(PRD|PRT|SVC)-\d{8}-\d{4}$/, // PRD-20260116-0001 format
};
