/**
 * ElevatedAccessService Tests
 * Story 2.4: Elevated Access Requirement
 * AC#5: Elevated Access Session Storage
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ElevatedAccessService } from './elevated-access.service';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

describe('ElevatedAccessService', () => {
  let service: ElevatedAccessService;

  beforeEach(() => {
    service = new ElevatedAccessService();
    // Clear any previous state
    service.clearAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('recordVerification', () => {
    it('should store verification timestamp for user', () => {
      const userId = 'user-123';
      service.recordVerification(userId);

      expect(service.isVerificationValid(userId)).toBe(true);
    });

    it('should update timestamp on subsequent calls', () => {
      vi.useFakeTimers();
      const userId = 'user-123';

      // First verification at t=0
      service.recordVerification(userId);

      // Advance time by 2 minutes (t=2min)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Check remaining time before re-verification (should be ~3 minutes)
      const remainingBeforeReverify = service.getTimeRemaining(userId);
      expect(remainingBeforeReverify).toBe(3 * 60 * 1000); // 3 minutes left

      // Re-verify (should reset the TTL to full 5 minutes)
      service.recordVerification(userId);
      const remainingAfterReverify = service.getTimeRemaining(userId);

      // After re-verification, remaining time should be full TTL again
      expect(remainingAfterReverify).toBeGreaterThan(remainingBeforeReverify);
      expect(remainingAfterReverify).toBe(ELEVATED_ACCESS_TTL_MS);
    });
  });

  describe('isVerificationValid', () => {
    it('should return true when verification is within TTL', () => {
      const userId = 'user-123';
      service.recordVerification(userId);

      expect(service.isVerificationValid(userId)).toBe(true);
    });

    it('should return false when verification has expired', () => {
      vi.useFakeTimers();
      const userId = 'user-123';

      service.recordVerification(userId);

      // Advance time past TTL (5 minutes + 1 second)
      vi.advanceTimersByTime(ELEVATED_ACCESS_TTL_MS + 1000);

      expect(service.isVerificationValid(userId)).toBe(false);
    });

    it('should return false when user has never verified', () => {
      const userId = 'user-never-verified';

      expect(service.isVerificationValid(userId)).toBe(false);
    });

    it('should respect custom TTL', () => {
      vi.useFakeTimers();
      const userId = 'user-123';
      const customTtl = 60000; // 1 minute

      service.recordVerification(userId);

      // Still valid at 30 seconds
      vi.advanceTimersByTime(30000);
      expect(service.isVerificationValid(userId, customTtl)).toBe(true);

      // Expired after 1 minute + 1 second
      vi.advanceTimersByTime(31000);
      expect(service.isVerificationValid(userId, customTtl)).toBe(false);
    });

    it('should use default TTL of 5 minutes', () => {
      vi.useFakeTimers();
      const userId = 'user-123';

      service.recordVerification(userId);

      // Still valid at 4 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(service.isVerificationValid(userId)).toBe(true);

      // Expired at 5 minutes + 1 second
      vi.advanceTimersByTime(61000);
      expect(service.isVerificationValid(userId)).toBe(false);
    });
  });

  describe('getTimeRemaining', () => {
    it('should return correct remaining time', () => {
      vi.useFakeTimers();
      const userId = 'user-123';

      service.recordVerification(userId);

      // Advance by 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Should have ~3 minutes remaining
      const remaining = service.getTimeRemaining(userId);
      expect(remaining).toBe(3 * 60 * 1000);
    });

    it('should return 0 when verification has expired', () => {
      vi.useFakeTimers();
      const userId = 'user-123';

      service.recordVerification(userId);

      // Advance past TTL
      vi.advanceTimersByTime(ELEVATED_ACCESS_TTL_MS + 1000);

      expect(service.getTimeRemaining(userId)).toBe(0);
    });

    it('should return 0 when user has never verified', () => {
      const userId = 'user-never-verified';

      expect(service.getTimeRemaining(userId)).toBe(0);
    });

    it('should respect custom TTL', () => {
      vi.useFakeTimers();
      const userId = 'user-123';
      const customTtl = 60000; // 1 minute

      service.recordVerification(userId);

      // Advance by 30 seconds
      vi.advanceTimersByTime(30000);

      // Should have ~30 seconds remaining with custom TTL
      const remaining = service.getTimeRemaining(userId, customTtl);
      expect(remaining).toBe(30000);
    });
  });

  describe('getValidUntil', () => {
    it('should return ISO8601 timestamp', () => {
      const userId = 'user-123';
      service.recordVerification(userId);

      const validUntil = service.getValidUntil(userId);

      expect(validUntil).toBeDefined();
      expect(typeof validUntil).toBe('string');
      // Should be valid ISO8601 format
      expect(() => new Date(validUntil!)).not.toThrow();
    });

    it('should return null when user has never verified', () => {
      const userId = 'user-never-verified';

      expect(service.getValidUntil(userId)).toBeNull();
    });

    it('should return correct expiration time', () => {
      vi.useFakeTimers();
      const now = new Date('2026-01-16T10:00:00.000Z');
      vi.setSystemTime(now);

      const userId = 'user-123';
      service.recordVerification(userId);

      const validUntil = service.getValidUntil(userId);
      const expectedExpiration = new Date('2026-01-16T10:05:00.000Z'); // 5 minutes later

      expect(new Date(validUntil!).getTime()).toBe(expectedExpiration.getTime());
    });
  });

  describe('clearVerification', () => {
    it('should remove verification for user', () => {
      const userId = 'user-123';
      service.recordVerification(userId);

      expect(service.isVerificationValid(userId)).toBe(true);

      service.clearVerification(userId);

      expect(service.isVerificationValid(userId)).toBe(false);
    });

    it('should not affect other users', () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      service.recordVerification(userId1);
      service.recordVerification(userId2);

      service.clearVerification(userId1);

      expect(service.isVerificationValid(userId1)).toBe(false);
      expect(service.isVerificationValid(userId2)).toBe(true);
    });

    it('should be safe to call on non-existing user', () => {
      const userId = 'user-never-existed';

      expect(() => service.clearVerification(userId)).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should remove all verifications', () => {
      const userId1 = 'user-1';
      const userId2 = 'user-2';
      const userId3 = 'user-3';

      service.recordVerification(userId1);
      service.recordVerification(userId2);
      service.recordVerification(userId3);

      service.clearAll();

      expect(service.isVerificationValid(userId1)).toBe(false);
      expect(service.isVerificationValid(userId2)).toBe(false);
      expect(service.isVerificationValid(userId3)).toBe(false);
    });
  });

  describe('Multiple users', () => {
    it('should handle multiple users independently', () => {
      vi.useFakeTimers();
      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 verifies at t=0
      service.recordVerification(user1);

      // Advance 2 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);

      // User 2 verifies at t=2min
      service.recordVerification(user2);

      // Advance 2 more minutes (t=4min total)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // User 1 has ~1 minute left, User 2 has ~3 minutes left
      expect(service.getTimeRemaining(user1)).toBe(60 * 1000);
      expect(service.getTimeRemaining(user2)).toBe(3 * 60 * 1000);
    });
  });
});
