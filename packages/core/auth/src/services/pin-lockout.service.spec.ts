/**
 * PIN Lockout Service Unit Tests - TDD Red-Green-Refactor
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * AC3: PIN Lockout (3 Sikertelen Próbálkozás)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PinLockoutService, LOCKOUT_DURATION_MS, MAX_FAILED_ATTEMPTS } from './pin-lockout.service';

describe('PinLockoutService', () => {
  let pinLockoutService: PinLockoutService;
  let mockPrisma: {
    pinAttempt: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const deviceId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    mockPrisma = {
      pinAttempt: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
    };

    pinLockoutService = new PinLockoutService(mockPrisma as unknown as PrismaClient);
  });

  describe('checkLockout()', () => {
    describe('happy path', () => {
      it('should return false when no attempts recorded', async () => {
        // Arrange
        mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);

        // Act
        const result = await pinLockoutService.checkLockout(userId, deviceId);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false when under threshold (< 3 attempts)', async () => {
        // Arrange
        mockPrisma.pinAttempt.findUnique.mockResolvedValue({
          id: 'attempt-1',
          userId,
          deviceId,
          attemptCount: 2,
          lastAttemptAt: new Date(),
          lockedUntil: null,
        });

        // Act
        const result = await pinLockoutService.checkLockout(userId, deviceId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('lockout scenarios', () => {
      it('should return true when locked (lockedUntil in future)', async () => {
        // Arrange
        const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        mockPrisma.pinAttempt.findUnique.mockResolvedValue({
          id: 'attempt-1',
          userId,
          deviceId,
          attemptCount: 3,
          lastAttemptAt: new Date(),
          lockedUntil: futureDate,
        });

        // Act
        const result = await pinLockoutService.checkLockout(userId, deviceId);

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when lockout expired', async () => {
        // Arrange
        const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
        mockPrisma.pinAttempt.findUnique.mockResolvedValue({
          id: 'attempt-1',
          userId,
          deviceId,
          attemptCount: 3,
          lastAttemptAt: new Date(),
          lockedUntil: pastDate,
        });

        // Act
        const result = await pinLockoutService.checkLockout(userId, deviceId);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false when Prisma is not available', async () => {
        // Arrange
        const serviceWithoutPrisma = new PinLockoutService(null);

        // Act
        const result = await serviceWithoutPrisma.checkLockout(userId, deviceId);

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  describe('incrementFailedAttempt()', () => {
    describe('happy path', () => {
      it('should increment counter from 0 to 1', async () => {
        // Arrange
        mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);
        mockPrisma.pinAttempt.upsert.mockResolvedValue({
          id: 'attempt-1',
          userId,
          deviceId,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          lockedUntil: null,
        });

        // Act
        const result = await pinLockoutService.incrementFailedAttempt(userId, deviceId);

        // Assert
        expect(result.attemptCount).toBe(1);
        expect(result.isLocked).toBe(false);
      });

      it('should increment counter from 1 to 2', async () => {
        // Arrange
        mockPrisma.pinAttempt.findUnique.mockResolvedValue({
          id: 'attempt-1',
          userId,
          deviceId,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          lockedUntil: null,
        });
        mockPrisma.pinAttempt.upsert.mockResolvedValue({
          id: 'attempt-1',
          userId,
          deviceId,
          attemptCount: 2,
          lastAttemptAt: new Date(),
          lockedUntil: null,
        });

        // Act
        const result = await pinLockoutService.incrementFailedAttempt(userId, deviceId);

        // Assert
        expect(result.attemptCount).toBe(2);
        expect(result.isLocked).toBe(false);
      });
    });

    describe('lockout trigger', () => {
      it('should trigger lockout at threshold (3 attempts)', async () => {
        // Arrange
        mockPrisma.pinAttempt.findUnique.mockResolvedValue({
          id: 'attempt-1',
          userId,
          deviceId,
          attemptCount: 2,
          lastAttemptAt: new Date(),
          lockedUntil: null,
        });
        mockPrisma.pinAttempt.upsert.mockResolvedValue({
          id: 'attempt-1',
          userId,
          deviceId,
          attemptCount: 3,
          lastAttemptAt: new Date(),
          lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
        });

        // Act
        const result = await pinLockoutService.incrementFailedAttempt(userId, deviceId);

        // Assert
        expect(result.attemptCount).toBe(3);
        expect(result.isLocked).toBe(true);
        expect(result.lockedUntil).toBeDefined();
      });
    });

    describe('edge cases', () => {
      it('should return default values when Prisma is not available', async () => {
        // Arrange
        const serviceWithoutPrisma = new PinLockoutService(null);

        // Act
        const result = await serviceWithoutPrisma.incrementFailedAttempt(userId, deviceId);

        // Assert
        expect(result.attemptCount).toBe(0);
        expect(result.isLocked).toBe(false);
      });
    });
  });

  describe('resetAttempts()', () => {
    it('should delete attempt record on success', async () => {
      // Arrange
      mockPrisma.pinAttempt.delete.mockResolvedValue({
        id: 'attempt-1',
        userId,
        deviceId,
        attemptCount: 2,
        lastAttemptAt: new Date(),
        lockedUntil: null,
      });

      // Act
      await pinLockoutService.resetAttempts(userId, deviceId);

      // Assert
      expect(mockPrisma.pinAttempt.delete).toHaveBeenCalledWith({
        where: {
          userId_deviceId: { userId, deviceId },
        },
      });
    });

    it('should clear lockout on successful login', async () => {
      // Arrange
      mockPrisma.pinAttempt.delete.mockResolvedValue({
        id: 'attempt-1',
        userId,
        deviceId,
        attemptCount: 3,
        lastAttemptAt: new Date(),
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Act
      await pinLockoutService.resetAttempts(userId, deviceId);

      // Assert
      expect(mockPrisma.pinAttempt.delete).toHaveBeenCalled();
    });

    it('should not throw when record does not exist', async () => {
      // Arrange
      mockPrisma.pinAttempt.delete.mockRejectedValue({ code: 'P2025' });

      // Act & Assert
      await expect(pinLockoutService.resetAttempts(userId, deviceId)).resolves.not.toThrow();
    });

    it('should not throw when Prisma is not available', async () => {
      // Arrange
      const serviceWithoutPrisma = new PinLockoutService(null);

      // Act & Assert
      await expect(serviceWithoutPrisma.resetAttempts(userId, deviceId)).resolves.not.toThrow();
    });
  });

  describe('getRemainingLockoutTime()', () => {
    it('should return remaining time in seconds when locked', async () => {
      // Arrange
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
      mockPrisma.pinAttempt.findUnique.mockResolvedValue({
        id: 'attempt-1',
        userId,
        deviceId,
        attemptCount: 3,
        lastAttemptAt: new Date(),
        lockedUntil,
      });

      // Act
      const result = await pinLockoutService.getRemainingLockoutTime(userId, deviceId);

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(5 * 60); // 5 minutes in seconds
    });

    it('should return 0 when not locked', async () => {
      // Arrange
      mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);

      // Act
      const result = await pinLockoutService.getRemainingLockoutTime(userId, deviceId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('constants', () => {
    it('MAX_FAILED_ATTEMPTS should be 3', () => {
      expect(MAX_FAILED_ATTEMPTS).toBe(3);
    });

    it('LOCKOUT_DURATION_MS should be 15 minutes', () => {
      expect(LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
    });
  });
});
