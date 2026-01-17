import { describe, it, expect, vi } from 'vitest';
import { parseScanResult, playAudioFeedback } from '../../../src/lib/scanner';

describe('Scanner utilities', () => {
  describe('parseScanResult', () => {
    it('should parse JSON QR code data', () => {
      const jsonData = JSON.stringify({ type: 'rental', id: '12345' });
      const result = parseScanResult(jsonData);

      expect(result.format).toBe('QR_CODE');
      expect(result.value).toBe(jsonData);
      expect(result.parsedData).toEqual({ type: 'rental', id: '12345' });
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should parse EAN-13 barcode', () => {
      const result = parseScanResult('1234567890123');

      expect(result.format).toBe('EAN_13');
      expect(result.value).toBe('1234567890123');
      expect(result.parsedData).toBeUndefined();
    });

    it('should parse EAN-8 barcode', () => {
      const result = parseScanResult('12345678');

      expect(result.format).toBe('EAN_8');
      expect(result.value).toBe('12345678');
    });

    it('should parse CODE_128 barcode', () => {
      const result = parseScanResult('SKU-12345-AB');

      expect(result.format).toBe('CODE_128');
      expect(result.value).toBe('SKU-12345-AB');
    });

    it('should handle alphanumeric CODE_128', () => {
      const result = parseScanResult('PROD-001234');

      expect(result.format).toBe('CODE_128');
      expect(result.value).toBe('PROD-001234');
    });

    it('should return UNKNOWN for non-standard formats', () => {
      const result = parseScanResult('special!chars@here');

      expect(result.format).toBe('UNKNOWN');
      expect(result.value).toBe('special!chars@here');
    });

    it('should not parse invalid JSON as QR data', () => {
      const result = parseScanResult('{invalid json}');

      // Should not be parsed as JSON
      expect(result.parsedData).toBeUndefined();
    });

    it('should handle complex nested JSON', () => {
      const data = {
        type: 'work_order',
        id: 'WO-001',
        machine: { model: 'Bosch 123', serial: 'ABC' },
        items: [1, 2, 3],
      };
      const jsonData = JSON.stringify(data);
      const result = parseScanResult(jsonData);

      expect(result.format).toBe('QR_CODE');
      expect(result.parsedData).toEqual(data);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const result = parseScanResult('TEST123');
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('playAudioFeedback', () => {
    it('should not throw when soundPath is undefined', async () => {
      await expect(playAudioFeedback(undefined)).resolves.not.toThrow();
    });

    it('should not throw when soundPath is empty', async () => {
      await expect(playAudioFeedback('')).resolves.not.toThrow();
    });

    it('should attempt to play audio when soundPath is provided', async () => {
      // Mock Audio constructor
      const mockPlay = vi.fn().mockResolvedValue(undefined);
      const mockAudio = vi.fn().mockImplementation(() => ({
        play: mockPlay,
        volume: 1,
      }));

      vi.stubGlobal('Audio', mockAudio);

      await playAudioFeedback('/sounds/beep.mp3');

      expect(mockAudio).toHaveBeenCalledWith('/sounds/beep.mp3');
      expect(mockPlay).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('should set volume to 0.5', async () => {
      const mockAudioInstance = {
        play: vi.fn().mockResolvedValue(undefined),
        volume: 1,
      };
      const mockAudio = vi.fn().mockImplementation(() => mockAudioInstance);

      vi.stubGlobal('Audio', mockAudio);

      await playAudioFeedback('/sounds/beep.mp3');

      expect(mockAudioInstance.volume).toBe(0.5);

      vi.unstubAllGlobals();
    });

    it('should handle audio play errors gracefully', async () => {
      const mockPlay = vi.fn().mockRejectedValue(new Error('Audio failed'));
      const mockAudio = vi.fn().mockImplementation(() => ({
        play: mockPlay,
        volume: 1,
      }));

      vi.stubGlobal('Audio', mockAudio);

      // Should not throw
      await expect(playAudioFeedback('/sounds/beep.mp3')).resolves.not.toThrow();

      vi.unstubAllGlobals();
    });
  });
});
