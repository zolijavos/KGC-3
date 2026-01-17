# Story 5.7: Barcode Scanner Integration

## Status: done

## User Story

**As a** pultos,
**I want** vonalkódot USB scanner-rel vagy kamerával olvasni,
**So that** gyorsan azonosíthassak termékeket.

## Acceptance Criteria

- [x] AC1: USB barcode scanner támogatás (keyboard event capture)
- [x] AC2: Kamera alapú vonalkód/QR olvasás (html5-qrcode)
- [x] AC3: Hangjelzés sikeres scan-nél
- [x] AC4: Code128 és QR kód formátum támogatás
- [x] AC5: Scan result callback/event rendszer
- [x] AC6: Scan timeout és hibakezelés

## Technical Context

**Package:** @kgc/ui
**Architecture:** ADR-022 (Vonalkód/QR Stratégia), ADR-023 (Composable frontend)

**Dependencies:**
- html5-qrcode (camera scanning)
- native Web APIs (keyboard events for USB scanner)

**Related Files:**
- packages/shared/ui/src/hooks/use-barcode-scanner.ts
- packages/shared/ui/src/hooks/use-camera-scanner.ts
- packages/shared/ui/src/components/scanner/barcode-scanner.tsx
- packages/shared/ui/src/components/scanner/camera-scanner.tsx
- packages/shared/ui/src/lib/scanner/types.ts

## Tasks

1. [x] Install html5-qrcode library
2. [x] Create scanner types and interfaces
3. [x] Create useBarcodeScanner hook (USB/keyboard events)
4. [x] Create useCameraScanner hook (html5-qrcode)
5. [x] Create BarcodeScanner component (wrapper)
6. [x] Create CameraScanner component
7. [x] Add audio feedback utility
8. [x] Write unit tests for all components
9. [x] Export all from index.ts

## Test Plan

- Unit tests: Vitest with @testing-library/react
- Test files: tests/hooks/use-barcode-scanner.spec.ts, etc.
- Coverage target: 80%+

## Implementation Summary

### Hooks Created

1. **useBarcodeScanner** - USB/keyboard scanner hook:
   - Captures keyboard events for USB barcode scanners
   - Configurable terminator key (default: Enter)
   - Buffer management with timeout
   - Min/max length validation
   - Audio feedback on successful scan

2. **useCameraScanner** - Camera scanner hook:
   - Uses html5-qrcode library
   - Camera availability detection
   - Start/stop scanning control
   - Timeout support
   - Error handling (permission denied, camera not found)

### Components Created

1. **CameraScanner** - Camera-based scanner component:
   - Shows camera viewfinder
   - Start/Stop controls
   - No camera fallback message
   - Error display

2. **BarcodeScanner** - Unified scanner component:
   - Combines USB and camera scanning
   - Shows scanner status indicator
   - Last scan result display
   - Optional camera fallback

### Types & Utilities

- **BarcodeFormat**: CODE_128, QR_CODE, EAN_13, EAN_8, UNKNOWN
- **ScanResult**: Parsed scan result with format detection
- **parseScanResult()**: Auto-detects JSON QR codes and barcode formats
- **playAudioFeedback()**: Audio feedback utility

### Test Coverage

- 644 tests passing
- 89.44% overall coverage
- 96%+ coverage on scanner components

## Notes

- USB barcode scanners act as keyboards, typing the barcode followed by Enter
- Camera scanning uses html5-qrcode library with fps: 10
- Support CODE_128 (1D barcodes) and QR_CODE (2D codes)
- Scan-First paradigm: central UX element per PRD

## Changelog

- 2026-01-16: Story created (in-progress)
- 2026-01-16: Implementation completed - all scanner functionality working, 644 tests passing (done)
