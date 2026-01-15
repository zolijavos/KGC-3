/**
 * Password Service Unit Tests - TDD Red-Green-Refactor
 * Story 1.1: JWT Login Endpoint
 * AC2: Jelszó validáció bcrypt hash-sel (min 10 rounds), timing attack védelem
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('hashPassword()', () => {
    describe('happy path', () => {
      it('should return bcrypt hash when valid password provided', async () => {
        const password = 'SecurePassword123!';

        const hash = await passwordService.hashPassword(password);

        // bcrypt hashes start with $2b$ or $2a$
        expect(hash).toMatch(/^\$2[ab]\$/);
        expect(hash.length).toBeGreaterThan(50);
      });

      it('should produce different hashes for same password (salt uniqueness)', async () => {
        const password = 'SamePassword123!';

        const hash1 = await passwordService.hashPassword(password);
        const hash2 = await passwordService.hashPassword(password);

        expect(hash1).not.toBe(hash2);
      });

      it('should use minimum 10 bcrypt rounds (ADR-032 security requirement)', async () => {
        const password = 'TestPassword123!';

        const hash = await passwordService.hashPassword(password);

        // bcrypt hash format: $2b$rounds$...
        // rounds is 2 digits, so $2b$10$ or $2b$12$ etc
        const roundsMatch = hash.match(/^\$2[ab]\$(\d{2})\$/);
        expect(roundsMatch).not.toBeNull();
        const rounds = parseInt(roundsMatch![1]!, 10);
        expect(rounds).toBeGreaterThanOrEqual(10);
      });
    });

    describe('error handling', () => {
      it('should throw when password is empty string', async () => {
        await expect(passwordService.hashPassword('')).rejects.toThrow('Password cannot be empty');
      });

      it('should throw when password is null/undefined', async () => {
        await expect(passwordService.hashPassword(null as unknown as string)).rejects.toThrow(
          'Password cannot be empty'
        );

        await expect(passwordService.hashPassword(undefined as unknown as string)).rejects.toThrow(
          'Password cannot be empty'
        );
      });
    });
  });

  describe('verifyPassword()', () => {
    describe('happy path', () => {
      it('should return true when password matches hash', async () => {
        const password = 'CorrectPassword123!';
        const hash = await passwordService.hashPassword(password);

        const result = await passwordService.verifyPassword(password, hash);

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false when password does not match hash', async () => {
        const password = 'CorrectPassword123!';
        const wrongPassword = 'WrongPassword456!';
        const hash = await passwordService.hashPassword(password);

        const result = await passwordService.verifyPassword(wrongPassword, hash);

        expect(result).toBe(false);
      });

      it('should return false for empty password without throwing', async () => {
        const hash = await passwordService.hashPassword('SomePassword123!');

        const result = await passwordService.verifyPassword('', hash);

        expect(result).toBe(false);
      });

      it('should handle invalid hash format gracefully', async () => {
        const result = await passwordService.verifyPassword('password', 'invalid-hash-format');

        expect(result).toBe(false);
      });
    });

    describe('security - timing attack protection', () => {
      it('should be constant-time (timing difference < 50ms for valid vs invalid)', async () => {
        const password = 'TimingTestPassword123!';
        const hash = await passwordService.hashPassword(password);

        // Measure time for correct password
        const correctTimes: number[] = [];
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          await passwordService.verifyPassword(password, hash);
          correctTimes.push(performance.now() - start);
        }

        // Measure time for incorrect password
        const incorrectTimes: number[] = [];
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          await passwordService.verifyPassword('WrongPassword!', hash);
          incorrectTimes.push(performance.now() - start);
        }

        const avgCorrect = correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length;
        const avgIncorrect = incorrectTimes.reduce((a, b) => a + b, 0) / incorrectTimes.length;

        // Timing difference should be minimal (< 50ms) to prevent timing attacks
        const timingDifference = Math.abs(avgCorrect - avgIncorrect);
        expect(timingDifference).toBeLessThan(50);
      });
    });
  });
});
