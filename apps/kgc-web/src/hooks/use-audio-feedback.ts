/**
 * Audio Feedback Hook
 * Provides audio feedback for POS operations (scan success/error, payment, etc.)
 */

import { useCallback, useEffect, useRef } from 'react';

export interface AudioFeedbackOptions {
  /** Volume level 0-1 (default: 0.5) */
  volume?: number;
  /** Whether audio is enabled (default: true) */
  enabled?: boolean;
}

// Simple beep frequencies
const FREQUENCIES = {
  success: 880, // A5 - high, pleasant
  error: 220, // A3 - low, warning
  scan: 1320, // E6 - quick, sharp
  payment: [523, 659, 784], // C5, E5, G5 - ascending chord
};

// Duration in milliseconds
const DURATIONS = {
  short: 100,
  medium: 200,
  long: 400,
};

/**
 * Hook for audio feedback in POS operations
 */
export function useAudioFeedback(options?: AudioFeedbackOptions) {
  const { volume = 0.5, enabled = true } = options ?? {};
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      )();
    }
    return audioContextRef.current;
  }, []);

  // Play a single tone
  const playTone = useCallback(
    (frequency: number, duration: number) => {
      if (!enabled) return;

      try {
        const audioContext = getAudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        // Fade in/out to avoid clicks
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);

        oscillator.start(now);
        oscillator.stop(now + duration / 1000);
      } catch (error) {
        console.warn('Audio feedback failed:', error);
      }
    },
    [enabled, volume, getAudioContext]
  );

  // Play success sound
  const playSuccess = useCallback(() => {
    playTone(FREQUENCIES.success, DURATIONS.medium);
  }, [playTone]);

  // Play error sound
  const playError = useCallback(() => {
    playTone(FREQUENCIES.error, DURATIONS.long);
  }, [playTone]);

  // Play scan sound (quick beep)
  const playScan = useCallback(() => {
    playTone(FREQUENCIES.scan, DURATIONS.short);
  }, [playTone]);

  // Play payment success sound (ascending chord)
  const playPayment = useCallback(() => {
    if (!enabled) return;

    const frequencies = FREQUENCIES.payment;
    frequencies.forEach((freq, index) => {
      setTimeout(() => playTone(freq, DURATIONS.medium), index * 100);
    });
  }, [enabled, playTone]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    playSuccess,
    playError,
    playScan,
    playPayment,
    playTone,
  };
}

/**
 * Simple function to play a beep (no hook needed)
 * Useful for one-off sounds
 */
export function playBeep(type: 'success' | 'error' | 'scan' = 'success', volume = 0.5): void {
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequency =
      type === 'success'
        ? FREQUENCIES.success
        : type === 'error'
          ? FREQUENCIES.error
          : FREQUENCIES.scan;

    const duration =
      type === 'error' ? DURATIONS.long : type === 'success' ? DURATIONS.medium : DURATIONS.short;

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);

    oscillator.start(now);
    oscillator.stop(now + duration / 1000);

    // Cleanup after sound finishes
    setTimeout(() => {
      audioContext.close();
    }, duration + 100);
  } catch (error) {
    console.warn('Beep failed:', error);
  }
}
