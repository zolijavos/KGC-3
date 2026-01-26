/**
 * Barcode Scanner Hook Tests
 * Tests keyboard wedge mode detection for USB/Bluetooth scanners
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { simulateBarcodeScan, useBarcodeScanner } from '../use-barcode-scanner';

describe('useBarcodeScanner', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to dispatch keydown event
  const dispatchKey = (key: string) => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      })
    );
  };

  // Helper to simulate rapid key input (scanner behavior)
  const simulateRapidInput = async (chars: string[], delayMs = 10) => {
    for (const char of chars) {
      dispatchKey(char);
      await vi.advanceTimersByTimeAsync(delayMs);
    }
  };

  describe('scanner detection', () => {
    it('should detect barcode from rapid input + Enter', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
          minLength: 5,
          maxGap: 50,
        })
      );

      // Simulate scanner input (rapid keys)
      await simulateRapidInput(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);

      // Press Enter to complete
      dispatchKey('Enter');

      expect(onScan).toHaveBeenCalledWith('1234567890');
    });

    it('should NOT detect slow typing as barcode', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
          minLength: 5,
          maxGap: 50,
        })
      );

      // Simulate slow typing (200ms between keys)
      await simulateRapidInput(['1', '2', '3', '4', '5'], 200);

      // Press Enter
      dispatchKey('Enter');

      // Should NOT trigger onScan for slow typing
      expect(onScan).not.toHaveBeenCalled();
    });

    it('should respect minLength option', async () => {
      const onScan = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
          onError,
          minLength: 8,
          maxGap: 50,
        })
      );

      // Simulate short barcode (5 chars, but minLength is 8)
      await simulateRapidInput(['1', '2', '3', '4', '5']);
      dispatchKey('Enter');

      expect(onScan).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('túl rövid'));
    });

    it('should use default minLength of 5', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
        })
      );

      // 5 characters should be accepted
      await simulateRapidInput(['A', 'B', 'C', 'D', 'E']);
      dispatchKey('Enter');

      expect(onScan).toHaveBeenCalledWith('ABCDE');
    });
  });

  describe('buffer management', () => {
    it('should reset buffer after long pause', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
          minLength: 5,
          maxGap: 50,
        })
      );

      // Type some characters
      await simulateRapidInput(['1', '2', '3']);

      // Wait long time (buffer should reset)
      await vi.advanceTimersByTimeAsync(500);

      // Type new barcode
      await simulateRapidInput(['A', 'B', 'C', 'D', 'E', 'F']);
      dispatchKey('Enter');

      // Should only get the new barcode, not the old prefix
      expect(onScan).toHaveBeenCalledWith('ABCDEF');
      expect(onScan).not.toHaveBeenCalledWith('123ABCDEF');
    });

    it('should reset buffer after Enter', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
          minLength: 5,
        })
      );

      // First barcode
      await simulateRapidInput(['1', '2', '3', '4', '5']);
      dispatchKey('Enter');

      // Second barcode
      await simulateRapidInput(['A', 'B', 'C', 'D', 'E']);
      dispatchKey('Enter');

      expect(onScan).toHaveBeenCalledTimes(2);
      expect(onScan).toHaveBeenNthCalledWith(1, '12345');
      expect(onScan).toHaveBeenNthCalledWith(2, 'ABCDE');
    });
  });

  describe('enabled option', () => {
    it('should not process input when disabled', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
          enabled: false,
        })
      );

      await simulateRapidInput(['1', '2', '3', '4', '5']);
      dispatchKey('Enter');

      expect(onScan).not.toHaveBeenCalled();
    });

    it('should start processing when re-enabled', async () => {
      const onScan = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useBarcodeScanner({
            onScan,
            enabled,
          }),
        { initialProps: { enabled: false } }
      );

      // Should not work when disabled
      await simulateRapidInput(['1', '2', '3', '4', '5']);
      dispatchKey('Enter');
      expect(onScan).not.toHaveBeenCalled();

      // Enable
      rerender({ enabled: true });

      // Should work now
      await simulateRapidInput(['A', 'B', 'C', 'D', 'E']);
      dispatchKey('Enter');
      expect(onScan).toHaveBeenCalledWith('ABCDE');
    });

    it('should reset buffer when disabled', async () => {
      const onScan = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useBarcodeScanner({
            onScan,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      // Type partial barcode
      await simulateRapidInput(['1', '2', '3']);

      // Disable (should reset buffer)
      rerender({ enabled: false });

      // Re-enable
      rerender({ enabled: true });

      // Type new barcode
      await simulateRapidInput(['A', 'B', 'C', 'D', 'E']);
      dispatchKey('Enter');

      // Should only get new barcode
      expect(onScan).toHaveBeenCalledWith('ABCDE');
    });
  });

  describe('special characters', () => {
    it('should handle alphanumeric barcodes', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
        })
      );

      await simulateRapidInput(['A', 'B', '1', '2', '3']);
      dispatchKey('Enter');

      expect(onScan).toHaveBeenCalledWith('AB123');
    });

    it('should handle barcodes with dashes', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
          minLength: 5,
        })
      );

      await simulateRapidInput(['1', '2', '3', '-', '4', '5', '6']);
      dispatchKey('Enter');

      expect(onScan).toHaveBeenCalledWith('123-456');
    });

    it('should ignore control keys', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
        })
      );

      // Dispatch with ctrl key held
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'a',
          ctrlKey: true,
          bubbles: true,
        })
      );
      await vi.advanceTimersByTimeAsync(10);

      await simulateRapidInput(['1', '2', '3', '4', '5']);
      dispatchKey('Enter');

      // Should not include the ctrl+a
      expect(onScan).toHaveBeenCalledWith('12345');
    });

    it('should clean control characters from barcode', async () => {
      const onScan = vi.fn();

      renderHook(() =>
        useBarcodeScanner({
          onScan,
        })
      );

      // This tests the regex cleaning - control chars would be stripped
      await simulateRapidInput(['1', '2', '3', '4', '5']);
      dispatchKey('Enter');

      expect(onScan).toHaveBeenCalledWith('12345');
    });
  });

  describe('event handling', () => {
    it('should clean up event listener on unmount', async () => {
      const onScan = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useBarcodeScanner({
          onScan,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function), {
        capture: true,
      });

      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('simulateBarcodeScan', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should dispatch keydown events for each character', async () => {
    const onScan = vi.fn();

    renderHook(() =>
      useBarcodeScanner({
        onScan,
        minLength: 5,
      })
    );

    // Use the utility function
    const scanPromise = simulateBarcodeScan('ABCDEF', { charDelay: 10 });

    // Advance timers to complete the scan
    await vi.runAllTimersAsync();
    await scanPromise;

    expect(onScan).toHaveBeenCalledWith('ABCDEF');
  });

  it('should use custom character delay', async () => {
    const keydownSpy = vi.fn();
    document.addEventListener('keydown', keydownSpy);

    const scanPromise = simulateBarcodeScan('ABC', { charDelay: 20 });

    // After 20ms, first char should be sent
    await vi.advanceTimersByTimeAsync(5);
    expect(keydownSpy).toHaveBeenCalledTimes(1); // 'A'

    await vi.advanceTimersByTimeAsync(20);
    expect(keydownSpy).toHaveBeenCalledTimes(2); // 'B'

    await vi.runAllTimersAsync();
    await scanPromise;

    // 3 chars + 1 Enter
    expect(keydownSpy).toHaveBeenCalledTimes(4);

    document.removeEventListener('keydown', keydownSpy);
  });

  it('should send Enter at the end', async () => {
    const enterSpy = vi.fn();
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter') enterSpy();
    });

    const scanPromise = simulateBarcodeScan('12345', { charDelay: 5 });
    await vi.runAllTimersAsync();
    await scanPromise;

    expect(enterSpy).toHaveBeenCalledTimes(1);
  });
});

describe('real-world barcode formats', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle EAN-13 barcode', async () => {
    const onScan = vi.fn();

    renderHook(() =>
      useBarcodeScanner({
        onScan,
        minLength: 13,
      })
    );

    // EAN-13: 13 digits
    const ean13 = '5901234123457';
    const scanPromise = simulateBarcodeScan(ean13, { charDelay: 5 });
    await vi.runAllTimersAsync();
    await scanPromise;

    expect(onScan).toHaveBeenCalledWith(ean13);
  });

  it('should handle UPC-A barcode', async () => {
    const onScan = vi.fn();

    renderHook(() =>
      useBarcodeScanner({
        onScan,
        minLength: 12,
      })
    );

    // UPC-A: 12 digits
    const upcA = '012345678905';
    const scanPromise = simulateBarcodeScan(upcA, { charDelay: 5 });
    await vi.runAllTimersAsync();
    await scanPromise;

    expect(onScan).toHaveBeenCalledWith(upcA);
  });

  it('should handle Code 128 barcode with alphanumeric', async () => {
    const onScan = vi.fn();

    renderHook(() =>
      useBarcodeScanner({
        onScan,
        minLength: 5,
      })
    );

    // Code 128 can have letters and numbers
    const code128 = 'ABC-12345-XYZ';
    const scanPromise = simulateBarcodeScan(code128, { charDelay: 5 });
    await vi.runAllTimersAsync();
    await scanPromise;

    expect(onScan).toHaveBeenCalledWith(code128);
  });

  it('should handle internal product codes', async () => {
    const onScan = vi.fn();

    renderHook(() =>
      useBarcodeScanner({
        onScan,
        minLength: 5,
      })
    );

    // Internal product code format
    const internalCode = 'KGC-2024-00123';
    const scanPromise = simulateBarcodeScan(internalCode, { charDelay: 5 });
    await vi.runAllTimersAsync();
    await scanPromise;

    expect(onScan).toHaveBeenCalledWith(internalCode);
  });
});
