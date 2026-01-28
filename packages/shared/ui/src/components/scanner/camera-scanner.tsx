'use client';

import * as React from 'react';
import { useCameraScanner } from '../../hooks/use-camera-scanner';
import type { CameraScannerConfig, ScanResult, ScannerError } from '../../lib/scanner';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface CameraScannerProps {
  /** Unique ID for the scanner element */
  id?: string;
  /** Callback when a barcode is scanned */
  onScan?: (result: ScanResult) => void;
  /** Callback when an error occurs */
  onError?: (error: ScannerError) => void;
  /** Scanner configuration */
  config?: CameraScannerConfig;
  /** Whether to show the start/stop button (default: true) */
  showControls?: boolean;
  /** Whether to auto-start scanning (default: false) */
  autoStart?: boolean;
  /** Custom class name */
  className?: string;
  /** Text for start button */
  startButtonText?: string;
  /** Text for stop button */
  stopButtonText?: string;
  /** Text shown when no camera is available */
  noCameraText?: string;
}

/**
 * Camera-based barcode/QR scanner component
 *
 * Uses the device camera to scan barcodes and QR codes.
 *
 * @example
 * ```tsx
 * <CameraScanner
 *   onScan={(result) => console.log('Scanned:', result.value)}
 *   config={{ fps: 10, qrbox: 200 }}
 * />
 * ```
 */
export const CameraScanner = React.forwardRef<HTMLDivElement, CameraScannerProps>(
  (
    {
      id = 'camera-scanner',
      onScan,
      onError,
      config,
      showControls = true,
      autoStart = false,
      className,
      startButtonText = 'Kamera indítása',
      stopButtonText = 'Kamera leállítása',
      noCameraText = 'Nincs elérhető kamera',
    },
    ref
  ) => {
    const scannerId = React.useId();
    const elementId = id ?? `scanner-${scannerId}`;

    const { startScanning, stopScanning, isScanning, isCameraAvailable, error } = useCameraScanner({
      ...(onScan ? { onScan } : {}),
      ...(onError ? { onError } : {}),
      ...(config ? { config } : {}),
    });

    // Auto-start if configured
    React.useEffect(() => {
      if (autoStart && isCameraAvailable) {
        startScanning(elementId);
      }

      return () => {
        stopScanning();
      };
    }, [autoStart, isCameraAvailable, elementId, startScanning, stopScanning]);

    const handleStart = async () => {
      await startScanning(elementId);
    };

    const handleStop = async () => {
      await stopScanning();
    };

    if (!isCameraAvailable) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg',
            className
          )}
          data-testid="camera-scanner"
        >
          <p className="text-sm text-muted-foreground">{noCameraText}</p>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} data-testid="camera-scanner">
        {/* Scanner viewport */}
        <div
          id={elementId}
          className="relative overflow-hidden rounded-lg bg-black"
          style={{ minHeight: 300 }}
        />

        {/* Error message */}
        {error && <p className="text-sm text-destructive">{error.message}</p>}

        {/* Controls */}
        {showControls && (
          <div className="flex gap-2">
            {!isScanning ? (
              <Button
                onClick={handleStart}
                type="button"
                variant="default"
                data-testid="start-camera-btn"
              >
                {startButtonText}
              </Button>
            ) : (
              <Button
                onClick={handleStop}
                type="button"
                variant="secondary"
                data-testid="stop-camera-btn"
              >
                {stopButtonText}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

CameraScanner.displayName = 'CameraScanner';
