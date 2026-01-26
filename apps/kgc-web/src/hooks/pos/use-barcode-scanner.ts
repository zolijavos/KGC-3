/**
 * Barcode Scanner Hook
 * Detects barcode input from USB/Bluetooth scanners in keyboard wedge mode
 *
 * Keyboard wedge mode:
 * - Scanner sends characters as keyboard input
 * - Characters arrive quickly (< 50ms between each)
 * - Barcode ends with Enter key
 */

import { useCallback, useEffect, useRef } from 'react';

export interface BarcodeScannerOptions {
  /** Callback when a barcode is scanned */
  onScan: (barcode: string) => void;
  /** Callback when scan fails (optional) */
  onError?: (error: string) => void;
  /** Minimum barcode length to accept (default: 5) */
  minLength?: number;
  /** Maximum time between characters in ms (default: 50) */
  maxGap?: number;
  /** Whether the scanner is enabled (default: true) */
  enabled?: boolean;
  /** Prevent default on Enter key (default: true) */
  preventDefault?: boolean;
}

interface ScannerState {
  buffer: string;
  lastKeyTime: number;
}

/**
 * Hook to detect barcode scanner input
 *
 * USB/Bluetooth scanners in keyboard wedge mode:
 * 1. Send characters as keyboard events
 * 2. Characters arrive rapidly (< 50ms gaps)
 * 3. End with Enter key
 *
 * This hook distinguishes scanner input from normal typing
 * by detecting the rapid character input pattern.
 */
export function useBarcodeScanner(options: BarcodeScannerOptions): void {
  const {
    onScan,
    onError,
    minLength = 5,
    maxGap = 50,
    enabled = true,
    preventDefault = true,
  } = options;

  const stateRef = useRef<ScannerState>({
    buffer: '',
    lastKeyTime: 0,
  });

  // Reset buffer if too much time has passed
  const resetBuffer = useCallback(() => {
    stateRef.current.buffer = '';
  }, []);

  // Process completed barcode
  const processBarcode = useCallback(
    (barcode: string) => {
      // Validate length
      if (barcode.length < minLength) {
        onError?.(`Vonalkód túl rövid: ${barcode.length} karakter (min: ${minLength})`);
        return;
      }

      // Clean the barcode (remove any control characters)
      // eslint-disable-next-line no-control-regex
      const cleanBarcode = barcode.replace(/[\x00-\x1F\x7F]/g, '').trim();

      if (cleanBarcode.length >= minLength) {
        onScan(cleanBarcode);
      }
    },
    [onScan, onError, minLength]
  );

  // Handle keydown events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if disabled or if typing in an input field (unless it's our hidden input)
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Don't interfere with input fields that are focused
      // Scanner should work even when input is focused, but we need special handling
      const now = Date.now();
      const timeSinceLastKey = now - stateRef.current.lastKeyTime;

      // If too much time has passed, reset buffer
      if (timeSinceLastKey > maxGap * 3) {
        resetBuffer();
      }

      // Handle Enter key - complete the barcode
      if (event.key === 'Enter') {
        const barcode = stateRef.current.buffer;

        // Only process if we have rapid input (scanner behavior)
        // and the buffer has content
        if (barcode.length > 0) {
          const avgGap = barcode.length > 1 ? timeSinceLastKey / barcode.length : maxGap + 1;

          // If average gap is within scanner speed, process as barcode
          if (avgGap <= maxGap || barcode.length >= minLength) {
            if (preventDefault && !isInputField) {
              event.preventDefault();
            }
            processBarcode(barcode);
          }
        }

        resetBuffer();
        return;
      }

      // Only process printable characters
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Check if this is rapid input (scanner behavior)
        if (timeSinceLastKey <= maxGap || stateRef.current.buffer.length === 0) {
          stateRef.current.buffer += event.key;
        } else {
          // Too slow - probably normal typing, reset and start fresh
          stateRef.current.buffer = event.key;
        }
      }

      stateRef.current.lastKeyTime = now;
    },
    [maxGap, minLength, preventDefault, processBarcode, resetBuffer]
  );

  // Set up global keyboard listener
  useEffect(() => {
    if (!enabled) return;

    // Use capture phase to get events before input fields
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enabled, handleKeyDown]);

  // Reset buffer on disable
  useEffect(() => {
    if (!enabled) {
      resetBuffer();
    }
  }, [enabled, resetBuffer]);
}

/**
 * Utility to simulate barcode scan for testing
 */
export function simulateBarcodeScan(
  barcode: string,
  options?: { charDelay?: number }
): Promise<void> {
  const { charDelay = 10 } = options ?? {};

  return new Promise(resolve => {
    let index = 0;

    const sendNextChar = () => {
      if (index < barcode.length) {
        const char = barcode[index];
        if (char) {
          document.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: char,
              bubbles: true,
              cancelable: true,
            })
          );
        }
        index++;
        setTimeout(sendNextChar, charDelay);
      } else {
        // Send Enter to complete
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
          })
        );
        resolve();
      }
    };

    sendNextChar();
  });
}
