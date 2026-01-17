/**
 * PIN Service Unit Tests - TDD Red-Green-Refactor
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * AC1, AC6: PIN hashing and verification with security requirements
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PinService } from './pin.service';

describe('PinService', () => {
  let pinService: PinService;
  let mockPrisma: {
    user: {
      update: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'operator@kgc.hu',
    name: 'Test Operator',
    pinHash: null as string | null,
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        update: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    pinService = new PinService(mockPrisma as unknown as PrismaClient);
  });

  describe('hashPin()', () => {
    describe('happy path', () => {
      it('should return bcrypt hash for valid PIN', async () => {
        const pin = '1234';

        const hash = await pinService.hashPin(pin);

        // bcrypt hashes start with $2b$ or $2a$
        expect(hash).toMatch(/^\$2[ab]\$/);
        expect(hash.length).toBeGreaterThan(50);
      });

      it('should produce different hashes for same PIN (salt uniqueness)', async () => {
        const pin = '5678';

        const hash1 = await pinService.hashPin(pin);
        const hash2 = await pinService.hashPin(pin);

        expect(hash1).not.toBe(hash2);
      });

      it('should accept 4-digit PIN', async () => {
        const hash = await pinService.hashPin('1234');
        expect(hash).toMatch(/^\$2[ab]\$/);
      });

      it('should accept 6-digit PIN', async () => {
        const hash = await pinService.hashPin('123456');
        expect(hash).toMatch(/^\$2[ab]\$/);
      });
    });

    describe('error handling', () => {
      it('should throw for PIN shorter than 4 digits', async () => {
        await expect(pinService.hashPin('123')).rejects.toThrow(
          'PIN must be 4-6 numeric digits'
        );
      });

      it('should throw for PIN longer than 6 digits', async () => {
        await expect(pinService.hashPin('1234567')).rejects.toThrow(
          'PIN must be 4-6 numeric digits'
        );
      });

      it('should throw for non-numeric PIN', async () => {
        await expect(pinService.hashPin('12ab')).rejects.toThrow(
          'PIN must be 4-6 numeric digits'
        );
      });

      it('should throw for empty PIN', async () => {
        await expect(pinService.hashPin('')).rejects.toThrow(
          'PIN must be 4-6 numeric digits'
        );
      });
    });
  });

  describe('verifyPin()', () => {
    describe('happy path', () => {
      it('should return true for correct PIN', async () => {
        const pin = '4321';
        const hash = await pinService.hashPin(pin);

        const result = await pinService.verifyPin(pin, hash);

        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false for incorrect PIN', async () => {
        const correctPin = '1234';
        const wrongPin = '9999';
        const hash = await pinService.hashPin(correctPin);

        const result = await pinService.verifyPin(wrongPin, hash);

        expect(result).toBe(false);
      });

      it('should return false for empty PIN without throwing', async () => {
        const hash = await pinService.hashPin('1234');

        const result = await pinService.verifyPin('', hash);

        expect(result).toBe(false);
      });

      it('should return false for invalid hash format', async () => {
        const result = await pinService.verifyPin('1234', 'invalid-hash');

        expect(result).toBe(false);
      });

      it('should return false for null hash', async () => {
        const result = await pinService.verifyPin('1234', null as unknown as string);

        expect(result).toBe(false);
      });
    });

    describe('security - timing attack protection', () => {
      it('should be constant-time (timing difference < 50ms for valid vs invalid)', async () => {
        const pin = '5678';
        const hash = await pinService.hashPin(pin);

        // Measure time for correct PIN
        const correctTimes: number[] = [];
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          await pinService.verifyPin(pin, hash);
          correctTimes.push(performance.now() - start);
        }

        // Measure time for incorrect PIN
        const incorrectTimes: number[] = [];
        for (let i = 0; i < 5; i++) {
          const start = performance.now();
          await pinService.verifyPin('0000', hash);
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

  describe('setPinForUser()', () => {
    describe('happy path', () => {
      it('should set PIN hash for user', async () => {
        const userId = mockUser.id;
        const pin = '9876';
        mockPrisma.user.update.mockResolvedValue({ ...mockUser, pinHash: 'hashed' });

        await pinService.setPinForUser(userId, pin);

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: { pinHash: expect.stringMatching(/^\$2[ab]\$/) },
        });
      });
    });

    describe('error handling', () => {
      it('should throw for invalid PIN format', async () => {
        await expect(pinService.setPinForUser(mockUser.id, 'abc')).rejects.toThrow(
          'PIN must be 4-6 numeric digits'
        );
      });

      it('should not call Prisma when Prisma is not available', async () => {
        const serviceWithoutPrisma = new PinService(null);

        // Should not throw, just silently return
        await expect(serviceWithoutPrisma.setPinForUser(mockUser.id, '1234')).resolves.toBeUndefined();
      });
    });
  });

  describe('getUserPinHash()', () => {
    it('should return pinHash for user with PIN set', async () => {
      const userWithPin = { ...mockUser, pinHash: '$2b$12$hashvalue' };
      mockPrisma.user.findUnique.mockResolvedValue(userWithPin);

      const result = await pinService.getUserPinHash(mockUser.id);

      expect(result).toBe(userWithPin.pinHash);
    });

    it('should return null for user without PIN set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, pinHash: null });

      const result = await pinService.getUserPinHash(mockUser.id);

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await pinService.getUserPinHash('unknown-user');

      expect(result).toBeNull();
    });
  });
});
