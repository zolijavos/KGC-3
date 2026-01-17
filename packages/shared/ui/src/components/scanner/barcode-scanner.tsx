'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { useBarcodeScanner } from '../../hooks/use-barcode-scanner';
import { CameraScanner } from './camera-scanner';
import type {
  ScanResult,
  ScannerError,
  KeyboardScannerConfig,
  CameraScannerConfig,
} from '../../lib/scanner';

export interface BarcodeScannerProps {
  /** Callback when a barcode is scanned (from any source) */
  onScan?: (result: ScanResult) => void;
  /** Callback when an error occurs */
  onError?: (error: ScannerError) => void;
  /** Configuration for keyboard/USB scanner */
  keyboardConfig?: KeyboardScannerConfig;
  /** Configuration for camera scanner */
  cameraConfig?: CameraScannerConfig;
  /** Whether to show camera scanner as fallback (default: true) */
  showCameraFallback?: boolean;
  /** Whether to auto-start keyboard scanner (default: true) */
  autoStartKeyboard?: boolean;
  /** Whether to auto-start camera scanner (default: false) */
  autoStartCamera?: boolean;
  /** Custom class name */
  className?: string;
  /** Header text */
  headerText?: string;
  /** Help text */
  helpText?: string;
  /** Custom class name for camera scanner */
  cameraClassName?: string;
}

/**
 * Unified barcode scanner component
 *
 * Supports both USB/keyboard barcode scanners and camera-based scanning.
 * USB scanner is always active by default, camera is optional.
 *
 * @example
 * ```tsx
 * <BarcodeScanner
 *   onScan={(result) => {
 *     console.log('Scanned:', result.value);
 *     // Handle the scan result
 *   }}
 *   showCameraFallback={true}
 * />
 * ```
 */
export const BarcodeScanner = React.forwardRef<HTMLDivElement, BarcodeScannerProps>(
  (
    {
      onScan,
      onError,
      keyboardConfig,
      cameraConfig,
      showCameraFallback = true,
      autoStartKeyboard = true,
      autoStartCamera = false,
      className,
      headerText = 'Vonalkód beolvasása',
      helpText = 'Olvassa be a vonalkódot USB szkennerrel, vagy használja a kamerát.',
      cameraClassName,
    },
    ref
  ) => {
    const [lastScanSource, setLastScanSource] = React.useState<'keyboard' | 'camera' | null>(null);

    // Handle scan from any source
    const handleScan = React.useCallback(
      (result: ScanResult, source: 'keyboard' | 'camera') => {
        setLastScanSource(source);
        onScan?.(result);
      },
      [onScan]
    );

    // USB/Keyboard scanner
    const { lastScan: keyboardLastScan, isScanning: isKeyboardScanning } = useBarcodeScanner({
      onScan: (result) => handleScan(result, 'keyboard'),
      onError,
      config: keyboardConfig,
      autoStart: autoStartKeyboard,
    });

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-4', className)}
        data-testid="barcode-scanner"
      >
        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-lg font-medium">{headerText}</h3>
          <p className="text-sm text-muted-foreground">{helpText}</p>
        </div>

        {/* Keyboard scanner status */}
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full',
              isKeyboardScanning ? 'bg-green-500' : 'bg-gray-300'
            )}
          />
          <span className="text-muted-foreground">
            USB szkenner {isKeyboardScanning ? 'aktív' : 'inaktív'}
          </span>
        </div>

        {/* Last scan result */}
        {(keyboardLastScan || lastScanSource === 'camera') && (
          <div
            className={cn(
              'p-3 rounded-lg border',
              lastScanSource === 'keyboard' ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'
            )}
            data-testid="last-scan-result"
          >
            <p className="text-xs text-muted-foreground mb-1">
              Utolsó beolvasás ({lastScanSource === 'keyboard' ? 'USB szkenner' : 'Kamera'}):
            </p>
            <p className="font-mono font-medium">
              {keyboardLastScan?.value}
            </p>
          </div>
        )}

        {/* Camera fallback */}
        {showCameraFallback && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Vagy használja a kamerát:
            </p>
            <CameraScanner
              onScan={(result) => handleScan(result, 'camera')}
              onError={onError}
              config={cameraConfig}
              autoStart={autoStartCamera}
              className={cameraClassName}
            />
          </div>
        )}
      </div>
    );
  }
);

BarcodeScanner.displayName = 'BarcodeScanner';
