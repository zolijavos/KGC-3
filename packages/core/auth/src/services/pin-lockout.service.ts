/**
 * PIN Lockout Service - Brute force protection for PIN login
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * AC3: PIN Lockout (3 Sikertelen Próbálkozás)
 *
 * Security:
 * - 3 failed attempts → 15 minute lockout
 * - Lockout per user+device combination
 * - Full login resets lockout
 * - Lockout events are logged
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

/** Maximum failed PIN attempts before lockout (AC3) */
export const MAX_FAILED_ATTEMPTS = 3;

/** Lockout duration in milliseconds (15 minutes per AC3) */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Result of incrementing failed attempt */
export interface FailedAttemptResult {
  attemptCount: number;
  isLocked: boolean;
  lockedUntil?: Date;
}

@Injectable()
export class PinLockoutService {
  constructor(
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma?: PrismaClient | null
  ) {}

  /**
   * Check if user is locked out from PIN login on this device
   * @param userId - User ID
   * @param deviceId - Device ID
   * @returns true if user is currently locked out
   */
  async checkLockout(userId: string, deviceId: string): Promise<boolean> {
    if (!this.prisma) {
      return false;
    }

    const attempt = await this.prisma.pinAttempt.findUnique({
      where: {
        userId_deviceId: { userId, deviceId },
      },
    });

    if (!attempt) {
      return false;
    }

    // Check if lockedUntil is in the future
    if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
      return true;
    }

    return false;
  }

  /**
   * Increment failed attempt counter and trigger lockout if threshold reached
   * @param userId - User ID
   * @param deviceId - Device ID
   * @returns Current attempt count and lockout status
   */
  async incrementFailedAttempt(userId: string, deviceId: string): Promise<FailedAttemptResult> {
    if (!this.prisma) {
      return { attemptCount: 0, isLocked: false };
    }

    // Get current attempt count
    const existing = await this.prisma.pinAttempt.findUnique({
      where: {
        userId_deviceId: { userId, deviceId },
      },
    });

    const newCount = (existing?.attemptCount ?? 0) + 1;
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    // Upsert the attempt record
    const result = await this.prisma.pinAttempt.upsert({
      where: {
        userId_deviceId: { userId, deviceId },
      },
      update: {
        attemptCount: newCount,
        lastAttemptAt: new Date(),
        lockedUntil,
        updatedAt: new Date(),
      },
      create: {
        userId,
        deviceId,
        attemptCount: newCount,
        lastAttemptAt: new Date(),
        lockedUntil,
      },
    });

    return {
      attemptCount: result.attemptCount,
      isLocked: shouldLock,
      lockedUntil: result.lockedUntil ?? undefined,
    };
  }

  /**
   * Reset attempts on successful login (or full login)
   * @param userId - User ID
   * @param deviceId - Device ID
   */
  async resetAttempts(userId: string, deviceId: string): Promise<void> {
    if (!this.prisma) {
      return;
    }

    try {
      await this.prisma.pinAttempt.delete({
        where: {
          userId_deviceId: { userId, deviceId },
        },
      });
    } catch (error) {
      // Record may not exist - that's fine
      if ((error as { code?: string })?.code !== 'P2025') {
        throw error;
      }
    }
  }

  /**
   * Get remaining lockout time in seconds
   * @param userId - User ID
   * @param deviceId - Device ID
   * @returns Remaining seconds, or 0 if not locked
   */
  async getRemainingLockoutTime(userId: string, deviceId: string): Promise<number> {
    if (!this.prisma) {
      return 0;
    }

    const attempt = await this.prisma.pinAttempt.findUnique({
      where: {
        userId_deviceId: { userId, deviceId },
      },
    });

    if (!attempt?.lockedUntil) {
      return 0;
    }

    const remaining = attempt.lockedUntil.getTime() - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /**
   * Get attempt info for a user/device combination
   * Useful for logging and debugging
   */
  async getAttemptInfo(userId: string, deviceId: string): Promise<{
    attemptCount: number;
    lastAttemptAt: Date | null;
    lockedUntil: Date | null;
  } | null> {
    if (!this.prisma) {
      return null;
    }

    const attempt = await this.prisma.pinAttempt.findUnique({
      where: {
        userId_deviceId: { userId, deviceId },
      },
    });

    if (!attempt) {
      return null;
    }

    return {
      attemptCount: attempt.attemptCount,
      lastAttemptAt: attempt.lastAttemptAt,
      lockedUntil: attempt.lockedUntil,
    };
  }
}
