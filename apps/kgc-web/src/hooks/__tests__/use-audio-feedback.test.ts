/**
 * Audio Feedback Hook Tests
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playBeep, useAudioFeedback } from '../use-audio-feedback';

// OscillatorType from Web Audio API
type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';

// Mock AudioContext
const createMockOscillator = () => ({
  frequency: { value: 0 },
  type: 'sine' as OscillatorType,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
});

const createMockGainNode = () => ({
  gain: {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
});

const createMockAudioContext = () => ({
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => createMockOscillator()),
  createGain: vi.fn(() => createMockGainNode()),
  close: vi.fn(),
});

describe('useAudioFeedback', () => {
  let originalAudioContext: typeof AudioContext;
  let mockAudioContextInstance: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    originalAudioContext = window.AudioContext;
    mockAudioContextInstance = createMockAudioContext();
    // @ts-expect-error - mocking global
    window.AudioContext = vi.fn(() => mockAudioContextInstance);
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
  });

  it('should return audio control functions', () => {
    const { result } = renderHook(() => useAudioFeedback());

    expect(result.current).toHaveProperty('playSuccess');
    expect(result.current).toHaveProperty('playError');
    expect(result.current).toHaveProperty('playScan');
    expect(result.current).toHaveProperty('playPayment');
    expect(result.current).toHaveProperty('playTone');
  });

  it('should create AudioContext on first play', () => {
    const { result } = renderHook(() => useAudioFeedback());

    act(() => {
      result.current.playSuccess();
    });

    expect(window.AudioContext).toHaveBeenCalled();
    expect(mockAudioContextInstance.createOscillator).toHaveBeenCalled();
  });

  it('should not play when disabled', () => {
    const { result } = renderHook(() => useAudioFeedback({ enabled: false }));

    act(() => {
      result.current.playSuccess();
    });

    // AudioContext should not be created when disabled
    expect(mockAudioContextInstance.createOscillator).not.toHaveBeenCalled();
  });

  it('should respect volume option', () => {
    const gainNode = createMockGainNode();
    mockAudioContextInstance.createGain = vi.fn(() => gainNode);

    const { result } = renderHook(() => useAudioFeedback({ volume: 0.8 }));

    act(() => {
      result.current.playSuccess();
    });

    // Volume should be ramped to 0.8
    expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8, expect.any(Number));
  });

  describe('playSuccess', () => {
    it('should play a success tone at 880Hz', () => {
      const oscillator = createMockOscillator();
      mockAudioContextInstance.createOscillator = vi.fn(() => oscillator);

      const { result } = renderHook(() => useAudioFeedback());

      act(() => {
        result.current.playSuccess();
      });

      expect(oscillator.frequency.value).toBe(880);
    });
  });

  describe('playError', () => {
    it('should play an error tone at 220Hz', () => {
      const oscillator = createMockOscillator();
      mockAudioContextInstance.createOscillator = vi.fn(() => oscillator);

      const { result } = renderHook(() => useAudioFeedback());

      act(() => {
        result.current.playError();
      });

      expect(oscillator.frequency.value).toBe(220);
    });
  });

  describe('playScan', () => {
    it('should play a scan tone at 1320Hz', () => {
      const oscillator = createMockOscillator();
      mockAudioContextInstance.createOscillator = vi.fn(() => oscillator);

      const { result } = renderHook(() => useAudioFeedback());

      act(() => {
        result.current.playScan();
      });

      expect(oscillator.frequency.value).toBe(1320);
    });
  });

  describe('playPayment', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useAudioFeedback());
      expect(typeof result.current.playPayment).toBe('function');
    });

    it('should not throw when called', () => {
      const { result } = renderHook(() => useAudioFeedback());
      expect(() => {
        act(() => {
          result.current.playPayment();
        });
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should close AudioContext on unmount', () => {
      const { result, unmount } = renderHook(() => useAudioFeedback());

      // Play something to create AudioContext
      act(() => {
        result.current.playSuccess();
      });

      unmount();

      expect(mockAudioContextInstance.close).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle AudioContext creation failure gracefully', () => {
      // @ts-expect-error - mocking global
      window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported');
      });

      const { result } = renderHook(() => useAudioFeedback());

      // Should not throw
      expect(() => {
        act(() => {
          result.current.playSuccess();
        });
      }).not.toThrow();
    });
  });
});

describe('playBeep', () => {
  let originalAudioContext: typeof AudioContext;
  let mockAudioContextInstance: ReturnType<typeof createMockAudioContext>;

  beforeEach(() => {
    originalAudioContext = window.AudioContext;
    mockAudioContextInstance = createMockAudioContext();
    // @ts-expect-error - mocking global
    window.AudioContext = vi.fn(() => mockAudioContextInstance);
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
  });

  it('should play success beep by default', () => {
    const oscillator = createMockOscillator();
    mockAudioContextInstance.createOscillator = vi.fn(() => oscillator);

    playBeep();

    expect(oscillator.frequency.value).toBe(880);
  });

  it('should play error beep when type is error', () => {
    const oscillator = createMockOscillator();
    mockAudioContextInstance.createOscillator = vi.fn(() => oscillator);

    playBeep('error');

    expect(oscillator.frequency.value).toBe(220);
  });

  it('should play scan beep when type is scan', () => {
    const oscillator = createMockOscillator();
    mockAudioContextInstance.createOscillator = vi.fn(() => oscillator);

    playBeep('scan');

    expect(oscillator.frequency.value).toBe(1320);
  });

  it('should use provided volume', () => {
    const gainNode = createMockGainNode();
    mockAudioContextInstance.createGain = vi.fn(() => gainNode);

    playBeep('success', 0.3);

    expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.3, expect.any(Number));
  });

  it('should close AudioContext after playing', () => {
    vi.useFakeTimers();

    playBeep('success');

    // Advance past the cleanup timeout
    vi.advanceTimersByTime(500);

    expect(mockAudioContextInstance.close).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should handle errors gracefully', () => {
    // @ts-expect-error - mocking global
    window.AudioContext = vi.fn(() => {
      throw new Error('Not supported');
    });

    // Should not throw
    expect(() => playBeep()).not.toThrow();
  });
});
