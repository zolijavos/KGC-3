'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ScanResult,
  ScannerError,
  ScannerState,
  CameraScannerConfig,
  OnScanCallback,
  OnErrorCallback,
  BarcodeFormat,
} from '../lib/scanner';
import { parseScanResult, playAudioFeedback } from '../lib/scanner';

/**
 * Default configuration for camera scanner
 */
const DEFAULT_CONFIG: CameraScannerConfig = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  formatsToSupport: ['CODE_128', 'QR_CODE'],
  preferBackCamera: true,
  timeout: 0,
};

/**
 * Return type for useCameraScanner hook
 */
export interface UseCameraScanner {
  /** Current scanner state */
  state: ScannerState;
  /** Start camera scanning */
  startScanning: (elementId: string) => Promise<void>;
  /** Stop camera scanning */
  stopScanning: () => Promise<void>;
  /** Clear the last scan result */
  clearLastScan: () => void;
  /** Whether the scanner is actively scanning */
  isScanning: boolean;
  /** Whether camera is available */
  isCameraAvailable: boolean;
  /** Last successful scan result */
  lastScan: ScanResult | null;
  /** Last error if any */
  error: ScannerError | null;
}

/**
 * Map our BarcodeFormat to html5-qrcode format IDs
 */
function getHtml5QrcodeFormats(formats: BarcodeFormat[]): number[] {
  // Import dynamically to avoid SSR issues
  const formatMap: Record<BarcodeFormat, number> = {
    QR_CODE: 0,     // Html5QrcodeSupportedFormats.QR_CODE
    CODE_128: 14,   // Html5QrcodeSupportedFormats.CODE_128
    EAN_13: 11,     // Html5QrcodeSupportedFormats.EAN_13
    EAN_8: 10,      // Html5QrcodeSupportedFormats.EAN_8
    UNKNOWN: 0,
  };

  return formats.map((f) => formatMap[f]).filter((f) => f !== undefined);
}

/**
 * Hook for handling camera-based barcode/QR scanning
 *
 * Uses html5-qrcode library for camera access and decoding.
 *
 * @example
 * ```tsx
 * const { startScanning, stopScanning, lastScan, error } = useCameraScanner({
 *   onScan: (result) => console.log('Scanned:', result.value),
 *   config: { fps: 10, qrbox: 200 }
 * });
 *
 * // In JSX: <div id="scanner" />
 * // Then call: startScanning('scanner')
 * ```
 */
export function useCameraScanner(
  options: {
    /** Callback when a barcode is successfully scanned */
    onScan?: OnScanCallback;
    /** Callback when an error occurs */
    onError?: OnErrorCallback;
    /** Scanner configuration */
    config?: CameraScannerConfig;
  } = {}
): UseCameraScanner {
  const { onScan, onError, config = {} } = options;

  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    isInitialized: false,
    isCameraAvailable: false,
    lastScan: null,
    error: null,
  });

  // Reference to the scanner instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if camera is available
   */
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some((d) => d.kind === 'videoinput');
          setState((prev) => ({
            ...prev,
            isCameraAvailable: hasCamera,
            isInitialized: true,
          }));
        }
      } catch {
        setState((prev) => ({
          ...prev,
          isCameraAvailable: false,
          isInitialized: true,
        }));
      }
    };

    checkCamera();
  }, []);

  /**
   * Handle successful scan
   */
  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      // Parse the scan result
      const result = parseScanResult(decodedText);

      // Play success sound
      playAudioFeedback(config.successSound);

      // Update state
      setState((prev) => ({
        ...prev,
        lastScan: result,
        error: null,
      }));

      // Call callback
      onScan?.(result);
    },
    [config.successSound, onScan]
  );

  /**
   * Handle scan error
   */
  const handleScanError = useCallback(
    (errorMessage: string) => {
      // html5-qrcode reports "not found" frequently, which isn't really an error
      if (errorMessage.toLowerCase().includes('not found')) {
        return;
      }

      const error: ScannerError = {
        type: 'DECODE_ERROR',
        message: errorMessage,
      };

      // Only report actual errors, not "not found" messages
      if (!errorMessage.toLowerCase().includes('scanning')) {
        setState((prev) => ({ ...prev, error }));
        playAudioFeedback(config.errorSound);
        onError?.(error);
      }
    },
    [config.errorSound, onError]
  );

  /**
   * Start scanning
   */
  const startScanning = useCallback(
    async (elementId: string) => {
      // Check if we're in browser
      if (typeof window === 'undefined') {
        const error: ScannerError = {
          type: 'INITIALIZATION_ERROR',
          message: 'Camera scanning is only available in browser',
        };
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
        return;
      }

      try {
        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode');

        // Stop any existing scanner
        if (scannerRef.current) {
          await scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
        }

        // Create new scanner instance
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        // Determine camera facing mode
        const cameraConfig = mergedConfig.preferBackCamera
          ? { facingMode: 'environment' }
          : { facingMode: 'user' };

        // Start scanning
        await scanner.start(
          cameraConfig,
          {
            fps: mergedConfig.fps,
            qrbox: mergedConfig.qrbox,
            formatsToSupport: getHtml5QrcodeFormats(mergedConfig.formatsToSupport ?? ['CODE_128', 'QR_CODE']),
          },
          handleScanSuccess,
          handleScanError
        );

        setState((prev) => ({
          ...prev,
          isScanning: true,
          error: null,
        }));

        // Set timeout if configured
        if (mergedConfig.timeout && mergedConfig.timeout > 0) {
          timeoutRef.current = setTimeout(async () => {
            await stopScanning();
            const error: ScannerError = {
              type: 'SCAN_TIMEOUT',
              message: `Scanning timed out after ${mergedConfig.timeout}ms`,
            };
            setState((prev) => ({ ...prev, error }));
            onError?.(error);
          }, mergedConfig.timeout);
        }
      } catch (err) {
        let error: ScannerError;

        if (err instanceof Error) {
          if (err.message.includes('Permission') || err.name === 'NotAllowedError') {
            error = {
              type: 'CAMERA_PERMISSION_DENIED',
              message: 'Camera permission was denied',
              originalError: err,
            };
          } else if (err.message.includes('NotFound') || err.name === 'NotFoundError') {
            error = {
              type: 'CAMERA_NOT_FOUND',
              message: 'No camera found on this device',
              originalError: err,
            };
          } else {
            error = {
              type: 'INITIALIZATION_ERROR',
              message: err.message,
              originalError: err,
            };
          }
        } else {
          error = {
            type: 'UNKNOWN_ERROR',
            message: 'Failed to start camera scanner',
          };
        }

        setState((prev) => ({ ...prev, error }));
        onError?.(error);
      }
    },
    [mergedConfig, handleScanSuccess, handleScanError, onError]
  );

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(async () => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Stop scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignore errors when stopping
      }
      scannerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isScanning: false,
    }));
  }, []);

  /**
   * Clear last scan
   */
  const clearLastScan = useCallback(() => {
    setState((prev) => ({
      ...prev,
      lastScan: null,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return {
    state,
    startScanning,
    stopScanning,
    clearLastScan,
    isScanning: state.isScanning,
    isCameraAvailable: state.isCameraAvailable ?? false,
    lastScan: state.lastScan,
    error: state.error,
  };
}

export type { CameraScannerConfig };
