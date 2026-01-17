import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarcodeScanner } from '../../src/hooks/use-barcode-scanner';

describe('useBarcodeScanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should auto-start scanning by default', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      expect(result.current.isScanning).toBe(true);
      expect(result.current.state.isInitialized).toBe(true);
    });

    it('should not auto-start when autoStart is false', () => {
      const { result } = renderHook(() =>
        useBarcodeScanner({ autoStart: false })
      );

      expect(result.current.isScanning).toBe(false);
    });

    it('should have null lastScan initially', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      expect(result.current.lastScan).toBeNull();
    });

    it('should have null error initially', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      expect(result.current.error).toBeNull();
    });
  });

  describe('keyboard event handling', () => {
    it('should process barcode on Enter key', () => {
      const onScan = vi.fn();
      const { result } = renderHook(() => useBarcodeScanner({ onScan }));

      // Simulate rapid keystrokes (USB scanner behavior)
      const keys = ['S', 'K', 'U', '-', '1', '2', '3'];
      keys.forEach((key) => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        // Small time gap for scanner
        vi.advanceTimersByTime(20);
      });

      // Press Enter to complete scan
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(onScan).toHaveBeenCalledTimes(1);
      expect(onScan).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'SKU-123',
          format: 'CODE_128',
        })
      );
    });

    it('should update lastScan on successful scan', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      // Simulate barcode scan
      const keys = ['T', 'E', 'S', 'T'];
      keys.forEach((key) => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        vi.advanceTimersByTime(20);
      });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(result.current.lastScan).not.toBeNull();
      expect(result.current.lastScan?.value).toBe('TEST');
    });

    it('should ignore single characters (manual typing)', () => {
      const onScan = vi.fn();
      const { result } = renderHook(() => useBarcodeScanner({ onScan }));

      // Type single character with long gap
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
      });

      vi.advanceTimersByTime(500); // Long gap (human typing)

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      // Too short, should not trigger scan
      expect(onScan).not.toHaveBeenCalled();
    });

    it('should clear buffer after timeout', () => {
      const onScan = vi.fn();
      renderHook(() => useBarcodeScanner({ onScan }));

      // Start typing
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'B' }));
      });

      // Wait for timeout (3x maxKeystrokeGap)
      vi.advanceTimersByTime(400);

      // Continue with new scan
      const keys = ['X', 'Y', 'Z'];
      keys.forEach((key) => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        vi.advanceTimersByTime(20);
      });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      // Should only have XYZ, not ABXYZ
      expect(onScan).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'XYZ',
        })
      );
    });

    it('should ignore modifier keys', () => {
      const onScan = vi.fn();
      renderHook(() => useBarcodeScanner({ onScan }));

      // Type with ctrl held
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'a', ctrlKey: true })
        );
      });
      vi.advanceTimersByTime(20);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(onScan).not.toHaveBeenCalled();
    });
  });

  describe('startScanning and stopScanning', () => {
    it('should start scanning when startScanning is called', () => {
      const { result } = renderHook(() =>
        useBarcodeScanner({ autoStart: false })
      );

      expect(result.current.isScanning).toBe(false);

      act(() => {
        result.current.startScanning();
      });

      expect(result.current.isScanning).toBe(true);
    });

    it('should stop scanning when stopScanning is called', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      expect(result.current.isScanning).toBe(true);

      act(() => {
        result.current.stopScanning();
      });

      expect(result.current.isScanning).toBe(false);
    });

    it('should not process events after stopScanning', () => {
      const onScan = vi.fn();
      const { result } = renderHook(() => useBarcodeScanner({ onScan }));

      act(() => {
        result.current.stopScanning();
      });

      // Try to scan
      const keys = ['T', 'E', 'S', 'T'];
      keys.forEach((key) => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        vi.advanceTimersByTime(20);
      });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(onScan).not.toHaveBeenCalled();
    });
  });

  describe('clearLastScan', () => {
    it('should clear last scan result', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      // Perform a scan
      const keys = ['T', 'E', 'S', 'T'];
      keys.forEach((key) => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        vi.advanceTimersByTime(20);
      });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(result.current.lastScan).not.toBeNull();

      act(() => {
        result.current.clearLastScan();
      });

      expect(result.current.lastScan).toBeNull();
    });
  });

  describe('configuration', () => {
    it('should use custom terminator key', () => {
      const onScan = vi.fn();
      renderHook(() =>
        useBarcodeScanner({
          onScan,
          config: { terminatorKey: 'Tab' },
        })
      );

      const keys = ['T', 'E', 'S', 'T'];
      keys.forEach((key) => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        vi.advanceTimersByTime(20);
      });

      // Enter should not work
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });
      expect(onScan).not.toHaveBeenCalled();

      // Tab should work
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      });
      expect(onScan).toHaveBeenCalled();
    });

    it('should respect minLength config', () => {
      const onScan = vi.fn();
      renderHook(() =>
        useBarcodeScanner({
          onScan,
          config: { minLength: 5 },
        })
      );

      // Type 4 characters (less than minLength)
      const keys = ['T', 'E', 'S', 'T'];
      keys.forEach((key) => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        vi.advanceTimersByTime(20);
      });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(onScan).not.toHaveBeenCalled();
    });

    it('should call onError for too long barcodes', () => {
      const onError = vi.fn();
      renderHook(() =>
        useBarcodeScanner({
          onError,
          config: { maxLength: 5 },
        })
      );

      // Type 10 characters (more than maxLength)
      const keys = '1234567890'.split('');
      keys.forEach((key) => {
        act(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });
        vi.advanceTimersByTime(20);
      });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DECODE_ERROR',
        })
      );
    });
  });
});
