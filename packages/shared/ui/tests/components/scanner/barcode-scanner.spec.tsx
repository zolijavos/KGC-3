import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarcodeScanner } from '../../../src/components/scanner/barcode-scanner';

// Mock the hooks
vi.mock('../../../src/hooks/use-barcode-scanner', () => ({
  useBarcodeScanner: vi.fn(),
}));

vi.mock('../../../src/hooks/use-camera-scanner', () => ({
  useCameraScanner: vi.fn(),
}));

// Mock CameraScanner component
vi.mock('../../../src/components/scanner/camera-scanner', () => ({
  CameraScanner: ({ onScan, ...props }: { onScan?: () => void }) => (
    <div data-testid="camera-scanner-mock" {...props}>
      Camera Scanner Mock
    </div>
  ),
}));

import { useBarcodeScanner } from '../../../src/hooks/use-barcode-scanner';
import { useCameraScanner } from '../../../src/hooks/use-camera-scanner';

describe('BarcodeScanner component', () => {
  const mockUseBarcodeScanner = {
    state: {
      isScanning: true,
      isInitialized: true,
      lastScan: null,
      error: null,
    },
    startScanning: vi.fn(),
    stopScanning: vi.fn(),
    clearLastScan: vi.fn(),
    isScanning: true,
    lastScan: null,
    error: null,
  };

  const mockUseCameraScanner = {
    state: {
      isScanning: false,
      isInitialized: true,
      isCameraAvailable: true,
      lastScan: null,
      error: null,
    },
    startScanning: vi.fn(),
    stopScanning: vi.fn(),
    clearLastScan: vi.fn(),
    isScanning: false,
    isCameraAvailable: true,
    lastScan: null,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBarcodeScanner).mockReturnValue(mockUseBarcodeScanner);
    vi.mocked(useCameraScanner).mockReturnValue(mockUseCameraScanner);
  });

  describe('rendering', () => {
    it('should render with testid', () => {
      render(<BarcodeScanner />);
      expect(screen.getByTestId('barcode-scanner')).toBeInTheDocument();
    });

    it('should render header text', () => {
      render(<BarcodeScanner />);
      expect(screen.getByText('Vonalkód beolvasása')).toBeInTheDocument();
    });

    it('should render help text', () => {
      render(<BarcodeScanner />);
      expect(
        screen.getByText(/Olvassa be a vonalkódot USB szkennerrel/)
      ).toBeInTheDocument();
    });

    it('should render custom header text', () => {
      render(<BarcodeScanner headerText="Scan Barcode" />);
      expect(screen.getByText('Scan Barcode')).toBeInTheDocument();
    });

    it('should render custom help text', () => {
      render(<BarcodeScanner helpText="Scan with USB or camera" />);
      expect(screen.getByText('Scan with USB or camera')).toBeInTheDocument();
    });
  });

  describe('keyboard scanner status', () => {
    it('should show active status when scanning', () => {
      vi.mocked(useBarcodeScanner).mockReturnValue({
        ...mockUseBarcodeScanner,
        isScanning: true,
      });

      render(<BarcodeScanner />);
      expect(screen.getByText('USB szkenner aktív')).toBeInTheDocument();
    });

    it('should show inactive status when not scanning', () => {
      vi.mocked(useBarcodeScanner).mockReturnValue({
        ...mockUseBarcodeScanner,
        isScanning: false,
      });

      render(<BarcodeScanner />);
      expect(screen.getByText('USB szkenner inaktív')).toBeInTheDocument();
    });
  });

  describe('last scan result', () => {
    it('should show last scan result when available', () => {
      vi.mocked(useBarcodeScanner).mockReturnValue({
        ...mockUseBarcodeScanner,
        lastScan: {
          value: 'SKU-12345',
          format: 'CODE_128',
          timestamp: Date.now(),
        },
      });

      render(<BarcodeScanner />);
      expect(screen.getByTestId('last-scan-result')).toBeInTheDocument();
      expect(screen.getByText('SKU-12345')).toBeInTheDocument();
    });

    it('should not show last scan result when none', () => {
      vi.mocked(useBarcodeScanner).mockReturnValue({
        ...mockUseBarcodeScanner,
        lastScan: null,
      });

      render(<BarcodeScanner />);
      expect(screen.queryByTestId('last-scan-result')).not.toBeInTheDocument();
    });
  });

  describe('camera fallback', () => {
    it('should show camera scanner by default', () => {
      render(<BarcodeScanner />);
      expect(screen.getByTestId('camera-scanner-mock')).toBeInTheDocument();
    });

    it('should hide camera scanner when showCameraFallback is false', () => {
      render(<BarcodeScanner showCameraFallback={false} />);
      expect(screen.queryByTestId('camera-scanner-mock')).not.toBeInTheDocument();
    });

    it('should show camera fallback label', () => {
      render(<BarcodeScanner />);
      expect(screen.getByText('Vagy használja a kamerát:')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call onScan when keyboard scan detected', () => {
      const onScan = vi.fn();
      render(<BarcodeScanner onScan={onScan} />);

      // The useBarcodeScanner hook should be called with onScan
      expect(useBarcodeScanner).toHaveBeenCalledWith(
        expect.objectContaining({
          onScan: expect.any(Function),
        })
      );
    });

    it('should call onError when error occurs', () => {
      const onError = vi.fn();
      render(<BarcodeScanner onError={onError} />);

      expect(useBarcodeScanner).toHaveBeenCalledWith(
        expect.objectContaining({
          onError,
        })
      );
    });

    it('should pass keyboardConfig to useBarcodeScanner', () => {
      const keyboardConfig = { minLength: 5, maxLength: 50 };
      render(<BarcodeScanner keyboardConfig={keyboardConfig} />);

      expect(useBarcodeScanner).toHaveBeenCalledWith(
        expect.objectContaining({
          config: keyboardConfig,
        })
      );
    });
  });

  describe('auto-start options', () => {
    it('should auto-start keyboard scanner by default', () => {
      render(<BarcodeScanner />);

      expect(useBarcodeScanner).toHaveBeenCalledWith(
        expect.objectContaining({
          autoStart: true,
        })
      );
    });

    it('should not auto-start keyboard when autoStartKeyboard is false', () => {
      render(<BarcodeScanner autoStartKeyboard={false} />);

      expect(useBarcodeScanner).toHaveBeenCalledWith(
        expect.objectContaining({
          autoStart: false,
        })
      );
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<BarcodeScanner className="my-custom-class" />);
      expect(screen.getByTestId('barcode-scanner')).toHaveClass('my-custom-class');
    });
  });
});
