/**
 * Scanner types and interfaces for @kgc/ui
 * Per ADR-022: Vonalkód/QR Kód Stratégia
 */

/**
 * Supported barcode formats
 */
export type BarcodeFormat = 'CODE_128' | 'QR_CODE' | 'EAN_13' | 'EAN_8' | 'UNKNOWN';

/**
 * Scan result from any scanner
 */
export interface ScanResult {
  /** The decoded text/data from the barcode/QR */
  value: string;
  /** The format of the scanned code */
  format: BarcodeFormat;
  /** Timestamp when the scan occurred */
  timestamp: number;
  /** If the scan was a JSON QR code, the parsed data */
  parsedData?: Record<string, unknown>;
}

/**
 * Scanner error types
 */
export type ScannerErrorType =
  | 'CAMERA_NOT_FOUND'
  | 'CAMERA_PERMISSION_DENIED'
  | 'SCAN_TIMEOUT'
  | 'DECODE_ERROR'
  | 'INITIALIZATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Scanner error
 */
export interface ScannerError {
  type: ScannerErrorType;
  message: string;
  originalError?: Error;
}

/**
 * Camera scanner configuration
 */
export interface CameraScannerConfig {
  /** Frames per second for scanning (default: 10) */
  fps?: number;
  /** Width/height of the scanning box in pixels */
  qrbox?: { width: number; height: number } | number;
  /** Which formats to support (default: CODE_128, QR_CODE) */
  formatsToSupport?: BarcodeFormat[];
  /** Whether to prefer back camera on mobile (default: true) */
  preferBackCamera?: boolean;
  /** Timeout in milliseconds (0 = no timeout) */
  timeout?: number;
  /** Audio file to play on successful scan */
  successSound?: string;
  /** Audio file to play on error */
  errorSound?: string;
}

/**
 * USB/Keyboard scanner configuration
 */
export interface KeyboardScannerConfig {
  /** Key that terminates the scan (default: 'Enter') */
  terminatorKey?: string;
  /** Maximum time between keystrokes in ms (default: 100) */
  maxKeystrokeGap?: number;
  /** Minimum length for a valid barcode (default: 3) */
  minLength?: number;
  /** Maximum length for a valid barcode (default: 100) */
  maxLength?: number;
  /** Element to listen on (default: document) */
  targetElement?: HTMLElement | null;
  /** Audio file to play on successful scan */
  successSound?: string;
}

/**
 * Scanner state
 */
export interface ScannerState {
  /** Is the scanner currently active/scanning */
  isScanning: boolean;
  /** Has the scanner been initialized */
  isInitialized: boolean;
  /** Is there a camera available (for camera scanner) */
  isCameraAvailable?: boolean;
  /** Last scan result */
  lastScan: ScanResult | null;
  /** Last error */
  error: ScannerError | null;
}

/**
 * Callback types for scanner hooks
 */
export type OnScanCallback = (result: ScanResult) => void;
export type OnErrorCallback = (error: ScannerError) => void;

/**
 * Parse a scan result to determine if it's JSON data
 */
export function parseScanResult(value: string): ScanResult {
  const timestamp = Date.now();

  // Try to parse as JSON (QR code with data)
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        value,
        format: 'QR_CODE',
        timestamp,
        parsedData: parsed as Record<string, unknown>,
      };
    }
  } catch {
    // Not JSON, treat as plain barcode
  }

  // Detect format based on content
  let format: BarcodeFormat = 'UNKNOWN';
  if (/^\d{13}$/.test(value)) {
    format = 'EAN_13';
  } else if (/^\d{8}$/.test(value)) {
    format = 'EAN_8';
  } else if (/^[A-Z0-9\-_.$/+%]+$/i.test(value)) {
    format = 'CODE_128';
  }

  return {
    value,
    format,
    timestamp,
  };
}

/**
 * Play audio feedback
 */
export async function playAudioFeedback(soundPath?: string): Promise<void> {
  if (!soundPath || typeof window === 'undefined') return;

  try {
    const audio = new Audio(soundPath);
    audio.volume = 0.5;
    await audio.play();
  } catch {
    // Silently fail - audio is optional
    console.warn('Failed to play scan audio');
  }
}
