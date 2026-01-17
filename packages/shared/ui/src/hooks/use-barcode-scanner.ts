'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ScanResult,
  ScannerError,
  ScannerState,
  KeyboardScannerConfig,
  OnScanCallback,
  OnErrorCallback,
} from '../lib/scanner';
import { parseScanResult, playAudioFeedback } from '../lib/scanner';

/**
 * Default configuration for keyboard scanner
 */
const DEFAULT_CONFIG: Required<Omit<KeyboardScannerConfig, 'targetElement' | 'successSound'>> = {
  terminatorKey: 'Enter',
  maxKeystrokeGap: 100,
  minLength: 3,
  maxLength: 100,
};

/**
 * Return type for useBarcodeScanner hook
 */
export interface UseBarcodeScanner {
  /** Current scanner state */
  state: ScannerState;
  /** Start listening for barcode scans */
  startScanning: () => void;
  /** Stop listening for barcode scans */
  stopScanning: () => void;
  /** Clear the last scan result */
  clearLastScan: () => void;
  /** Whether the scanner is actively listening */
  isScanning: boolean;
  /** Last successful scan result */
  lastScan: ScanResult | null;
  /** Last error if any */
  error: ScannerError | null;
}

/**
 * Hook for handling USB/keyboard barcode scanners
 *
 * USB barcode scanners typically act as keyboard devices,
 * typing the barcode characters rapidly followed by Enter.
 *
 * @example
 * ```tsx
 * const { lastScan, startScanning, stopScanning } = useBarcodeScanner({
 *   onScan: (result) => console.log('Scanned:', result.value),
 *   successSound: '/sounds/scan-success.mp3'
 * });
 * ```
 */
export function useBarcodeScanner(
  options: {
    /** Callback when a barcode is successfully scanned */
    onScan?: OnScanCallback;
    /** Callback when an error occurs */
    onError?: OnErrorCallback;
    /** Scanner configuration */
    config?: KeyboardScannerConfig;
    /** Start scanning automatically on mount (default: true) */
    autoStart?: boolean;
  } = {}
): UseBarcodeScanner {
  const {
    onScan,
    onError,
    config = {},
    autoStart = true,
  } = options;

  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    isInitialized: false,
    lastScan: null,
    error: null,
  });

  // Buffer for collecting keystrokes
  const bufferRef = useRef<string>('');
  const lastKeystrokeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Clear the buffer and reset
   */
  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Process a complete barcode
   */
  const processScan = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();

      // Validate length
      if (trimmedValue.length < mergedConfig.minLength) {
        return; // Too short, probably not a barcode
      }

      if (trimmedValue.length > mergedConfig.maxLength) {
        const error: ScannerError = {
          type: 'DECODE_ERROR',
          message: `Barcode too long (${trimmedValue.length} chars, max ${mergedConfig.maxLength})`,
        };
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
        return;
      }

      // Parse the scan result
      const result = parseScanResult(trimmedValue);

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
    [mergedConfig.minLength, mergedConfig.maxLength, config.successSound, onScan, onError]
  );

  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const now = Date.now();

      // Check if this is part of a rapid scan (USB scanner)
      // or manual typing (human)
      const timeSinceLastKey = now - lastKeystrokeRef.current;
      lastKeystrokeRef.current = now;

      // If too much time has passed, this might be a new scan
      if (timeSinceLastKey > mergedConfig.maxKeystrokeGap && bufferRef.current) {
        // Clear old buffer if significant time passed
        clearBuffer();
      }

      // Handle terminator key (usually Enter)
      if (event.key === mergedConfig.terminatorKey) {
        if (bufferRef.current) {
          processScan(bufferRef.current);
          clearBuffer();
        }
        // Prevent form submission if this was a barcode scan
        if (bufferRef.current.length >= mergedConfig.minLength) {
          event.preventDefault();
        }
        return;
      }

      // Only capture printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        bufferRef.current += event.key;

        // Set a timeout to clear buffer if no more keys come
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(clearBuffer, mergedConfig.maxKeystrokeGap * 3);
      }
    },
    [mergedConfig.terminatorKey, mergedConfig.maxKeystrokeGap, mergedConfig.minLength, processScan, clearBuffer]
  );

  /**
   * Start scanning
   */
  const startScanning = useCallback(() => {
    const target = config.targetElement ?? document;
    target.addEventListener('keydown', handleKeyDown as EventListener);

    setState((prev) => ({
      ...prev,
      isScanning: true,
      isInitialized: true,
      error: null,
    }));
  }, [config.targetElement, handleKeyDown]);

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(() => {
    const target = config.targetElement ?? document;
    target.removeEventListener('keydown', handleKeyDown as EventListener);
    clearBuffer();

    setState((prev) => ({
      ...prev,
      isScanning: false,
    }));
  }, [config.targetElement, handleKeyDown, clearBuffer]);

  /**
   * Clear last scan
   */
  const clearLastScan = useCallback(() => {
    setState((prev) => ({
      ...prev,
      lastScan: null,
    }));
  }, []);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart) {
      startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [autoStart, startScanning, stopScanning]);

  return {
    state,
    startScanning,
    stopScanning,
    clearLastScan,
    isScanning: state.isScanning,
    lastScan: state.lastScan,
    error: state.error,
  };
}

export type { KeyboardScannerConfig };
