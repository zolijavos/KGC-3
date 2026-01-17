import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraScanner } from '../../../src/components/scanner/camera-scanner';

// Mock html5-qrcode
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  })),
}));

// Mock useCameraScanner hook
vi.mock('../../../src/hooks/use-camera-scanner', () => ({
  useCameraScanner: vi.fn(),
}));

import { useCameraScanner } from '../../../src/hooks/use-camera-scanner';

describe('CameraScanner component', () => {
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
    vi.mocked(useCameraScanner).mockReturnValue(mockUseCameraScanner);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with testid', () => {
      render(<CameraScanner />);
      expect(screen.getByTestId('camera-scanner')).toBeInTheDocument();
    });

    it('should render scanner viewport', () => {
      render(<CameraScanner id="my-scanner" />);
      expect(document.getElementById('my-scanner')).toBeInTheDocument();
    });

    it('should render start button when not scanning', () => {
      vi.mocked(useCameraScanner).mockReturnValue({
        ...mockUseCameraScanner,
        isScanning: false,
      });

      render(<CameraScanner />);
      expect(screen.getByTestId('start-camera-btn')).toBeInTheDocument();
    });

    it('should render stop button when scanning', () => {
      vi.mocked(useCameraScanner).mockReturnValue({
        ...mockUseCameraScanner,
        isScanning: true,
      });

      render(<CameraScanner />);
      expect(screen.getByTestId('stop-camera-btn')).toBeInTheDocument();
    });

    it('should hide controls when showControls is false', () => {
      render(<CameraScanner showControls={false} />);
      expect(screen.queryByTestId('start-camera-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('stop-camera-btn')).not.toBeInTheDocument();
    });
  });

  describe('no camera available', () => {
    it('should show no camera message', () => {
      vi.mocked(useCameraScanner).mockReturnValue({
        ...mockUseCameraScanner,
        isCameraAvailable: false,
      });

      render(<CameraScanner />);
      expect(screen.getByText('Nincs elérhető kamera')).toBeInTheDocument();
    });

    it('should show custom no camera text', () => {
      vi.mocked(useCameraScanner).mockReturnValue({
        ...mockUseCameraScanner,
        isCameraAvailable: false,
      });

      render(<CameraScanner noCameraText="No camera found" />);
      expect(screen.getByText('No camera found')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call startScanning when start button clicked', async () => {
      const user = userEvent.setup();
      const mockStart = vi.fn();

      vi.mocked(useCameraScanner).mockReturnValue({
        ...mockUseCameraScanner,
        startScanning: mockStart,
      });

      render(<CameraScanner id="test-scanner" />);

      await user.click(screen.getByTestId('start-camera-btn'));

      expect(mockStart).toHaveBeenCalledWith('test-scanner');
    });

    it('should call stopScanning when stop button clicked', async () => {
      const user = userEvent.setup();
      const mockStop = vi.fn();

      vi.mocked(useCameraScanner).mockReturnValue({
        ...mockUseCameraScanner,
        isScanning: true,
        stopScanning: mockStop,
      });

      render(<CameraScanner />);

      await user.click(screen.getByTestId('stop-camera-btn'));

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('custom text', () => {
    it('should render custom start button text', () => {
      render(<CameraScanner startButtonText="Start Camera" />);
      expect(screen.getByText('Start Camera')).toBeInTheDocument();
    });

    it('should render custom stop button text', () => {
      vi.mocked(useCameraScanner).mockReturnValue({
        ...mockUseCameraScanner,
        isScanning: true,
      });

      render(<CameraScanner stopButtonText="Stop Camera" />);
      expect(screen.getByText('Stop Camera')).toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should show error message when error exists', () => {
      vi.mocked(useCameraScanner).mockReturnValue({
        ...mockUseCameraScanner,
        error: {
          type: 'CAMERA_PERMISSION_DENIED',
          message: 'Camera permission was denied',
        },
      });

      render(<CameraScanner />);
      expect(screen.getByText('Camera permission was denied')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<CameraScanner className="my-custom-class" />);
      expect(screen.getByTestId('camera-scanner')).toHaveClass('my-custom-class');
    });
  });

  describe('callbacks', () => {
    it('should pass onScan to hook', () => {
      const onScan = vi.fn();
      render(<CameraScanner onScan={onScan} />);

      expect(useCameraScanner).toHaveBeenCalledWith(
        expect.objectContaining({ onScan })
      );
    });

    it('should pass onError to hook', () => {
      const onError = vi.fn();
      render(<CameraScanner onError={onError} />);

      expect(useCameraScanner).toHaveBeenCalledWith(
        expect.objectContaining({ onError })
      );
    });

    it('should pass config to hook', () => {
      const config = { fps: 15, qrbox: 300 };
      render(<CameraScanner config={config} />);

      expect(useCameraScanner).toHaveBeenCalledWith(
        expect.objectContaining({ config })
      );
    });
  });
});
