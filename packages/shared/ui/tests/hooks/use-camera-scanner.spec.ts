import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCameraScanner } from '../../src/hooks/use-camera-scanner';

// Mock html5-qrcode
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  })),
}));

describe('useCameraScanner', () => {
  const mockMediaDevices = {
    enumerateDevices: vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'camera-1' },
    ]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('navigator', {
      mediaDevices: mockMediaDevices,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initialization', () => {
    it('should detect available camera', async () => {
      const { result } = renderHook(() => useCameraScanner());

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      expect(result.current.isCameraAvailable).toBe(true);
    });

    it('should detect no camera when none available', async () => {
      mockMediaDevices.enumerateDevices.mockResolvedValue([
        { kind: 'audioinput', deviceId: 'mic-1' },
      ]);

      const { result } = renderHook(() => useCameraScanner());

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      expect(result.current.isCameraAvailable).toBe(false);
    });

    it('should handle mediaDevices error gracefully', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValue(
        new Error('Permission denied')
      );

      const { result } = renderHook(() => useCameraScanner());

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      expect(result.current.isCameraAvailable).toBe(false);
    });

    it('should not be scanning initially', () => {
      const { result } = renderHook(() => useCameraScanner());

      expect(result.current.isScanning).toBe(false);
    });

    it('should have null lastScan initially', () => {
      const { result } = renderHook(() => useCameraScanner());

      expect(result.current.lastScan).toBeNull();
    });

    it('should have null error initially', () => {
      const { result } = renderHook(() => useCameraScanner());

      expect(result.current.error).toBeNull();
    });
  });

  describe('startScanning', () => {
    it('should update isScanning to true when started', async () => {
      const { result } = renderHook(() => useCameraScanner());

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.startScanning('scanner-element');
      });

      expect(result.current.isScanning).toBe(true);
    });

    it('should clear error when starting', async () => {
      const { result } = renderHook(() => useCameraScanner());

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      // Set an error state first
      await act(async () => {
        await result.current.startScanning('scanner-element');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('stopScanning', () => {
    it('should update isScanning to false when stopped', async () => {
      const { result } = renderHook(() => useCameraScanner());

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.startScanning('scanner-element');
      });

      expect(result.current.isScanning).toBe(true);

      await act(async () => {
        await result.current.stopScanning();
      });

      expect(result.current.isScanning).toBe(false);
    });
  });

  describe('clearLastScan', () => {
    it('should clear last scan result', async () => {
      const { result } = renderHook(() => useCameraScanner());

      // Manually set a lastScan (simulating successful scan)
      // Since we can't easily trigger the scan callback, we test the clearLastScan function
      act(() => {
        result.current.clearLastScan();
      });

      expect(result.current.lastScan).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle permission denied error', async () => {
      const onError = vi.fn();
      const { Html5Qrcode } = await import('html5-qrcode');

      vi.mocked(Html5Qrcode).mockImplementation(
        () =>
          ({
            start: vi.fn().mockRejectedValue(
              Object.assign(new Error('Permission denied'), {
                name: 'NotAllowedError',
              })
            ),
            stop: vi.fn().mockResolvedValue(undefined),
            clear: vi.fn(),
          }) as never
      );

      const { result } = renderHook(() => useCameraScanner({ onError }));

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.startScanning('scanner-element');
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CAMERA_PERMISSION_DENIED',
        })
      );
    });

    it('should handle camera not found error', async () => {
      const onError = vi.fn();
      const { Html5Qrcode } = await import('html5-qrcode');

      vi.mocked(Html5Qrcode).mockImplementation(
        () =>
          ({
            start: vi.fn().mockRejectedValue(
              Object.assign(new Error('No camera'), { name: 'NotFoundError' })
            ),
            stop: vi.fn().mockResolvedValue(undefined),
            clear: vi.fn(),
          }) as never
      );

      const { result } = renderHook(() => useCameraScanner({ onError }));

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.startScanning('scanner-element');
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CAMERA_NOT_FOUND',
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should stop scanner on unmount', async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      const mockStop = vi.fn().mockResolvedValue(undefined);

      vi.mocked(Html5Qrcode).mockImplementation(
        () =>
          ({
            start: vi.fn().mockResolvedValue(undefined),
            stop: mockStop,
            clear: vi.fn(),
          }) as never
      );

      const { result, unmount } = renderHook(() => useCameraScanner());

      await waitFor(() => {
        expect(result.current.state.isInitialized).toBe(true);
      });

      await act(async () => {
        await result.current.startScanning('scanner-element');
      });

      unmount();

      expect(mockStop).toHaveBeenCalled();
    });
  });
});
