/**
 * PIN Service - PIN code hashing and verification for kiosk mode
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * AC1: PIN hashing with bcrypt
 * AC6: Generic error messages for security
 *
 * Security:
 * - PIN must be 4-6 numeric digits
 * - bcrypt hashing (same as password, min 10 rounds)
 * - Constant-time comparison for timing attack protection
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/** PIN validation regex - 4-6 numeric digits only */
const PIN_REGEX = /^\d{4,6}$/;

/** Minimum bcrypt rounds per ADR-032 security requirements */
const MIN_BCRYPT_ROUNDS = 10;
/** Default bcrypt rounds for production use */
const DEFAULT_BCRYPT_ROUNDS = 12;

@Injectable()
export class PinService {
  private readonly rounds: number;

  /**
   * P5 fix: Made constructor fully injectable with @Inject decorators
   * @param prisma - Optional Prisma client for database operations
   * @param rounds - Optional bcrypt rounds (defaults to 12, min 10)
   */
  constructor(
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma?: PrismaClient | null,
    @Inject('BCRYPT_ROUNDS') @Optional() rounds?: number | null
  ) {
    this.rounds = Math.max(rounds ?? DEFAULT_BCRYPT_ROUNDS, MIN_BCRYPT_ROUNDS);
  }

  /**
   * Validate PIN format (4-6 numeric digits)
   * @param pin - PIN to validate
   * @throws Error if PIN format is invalid
   */
  private validatePinFormat(pin: string): void {
    if (!pin || !PIN_REGEX.test(pin)) {
      throw new Error('PIN must be 4-6 numeric digits');
    }
  }

  /**
   * Hash a PIN using bcrypt
   * @param pin - Plain text PIN (4-6 digits)
   * @returns Promise<string> - bcrypt hash
   * @throws Error if PIN format is invalid
   */
  async hashPin(pin: string): Promise<string> {
    this.validatePinFormat(pin);

    const salt = await bcrypt.genSalt(this.rounds);
    const hash = await bcrypt.hash(pin, salt);

    return hash;
  }

  /**
   * Verify a PIN against a bcrypt hash
   * Uses bcrypt.compare which is constant-time to prevent timing attacks
   * @param pin - Plain text PIN to verify
   * @param hashedPin - bcrypt hash to compare against
   * @returns Promise<boolean> - true if PIN matches, false otherwise
   */
  async verifyPin(pin: string, hashedPin: string): Promise<boolean> {
    // Return false for empty/invalid PIN without throwing (security)
    if (!pin || pin.length === 0) {
      return false;
    }

    // Validate hash format - bcrypt hashes start with $2a$, $2b$, or $2y$
    if (!hashedPin || !hashedPin.match(/^\$2[aby]\$/)) {
      return false;
    }

    try {
      // bcrypt.compare is constant-time (timing attack protection)
      const isMatch = await bcrypt.compare(pin, hashedPin);
      return isMatch;
    } catch {
      return false;
    }
  }

  /**
   * Set PIN for a user (hashes and stores)
   * @param userId - User ID
   * @param pin - Plain text PIN to set
   * @throws Error if PIN format is invalid
   */
  async setPinForUser(userId: string, pin: string): Promise<void> {
    this.validatePinFormat(pin);

    if (!this.prisma) {
      return;
    }

    const pinHash = await this.hashPin(pin);

    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash },
    });
  }

  /**
   * Get PIN hash for a user
   * @param userId - User ID
   * @returns PIN hash or null if not set/user not found
   */
  async getUserPinHash(userId: string): Promise<string | null> {
    if (!this.prisma) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pinHash: true },
    });

    return user?.pinHash ?? null;
  }

  /**
   * Check if user has PIN set
   * @param userId - User ID
   * @returns true if user has PIN set
   */
  async hasPinSet(userId: string): Promise<boolean> {
    const pinHash = await this.getUserPinHash(userId);
    return pinHash !== null;
  }

  /**
   * Clear PIN for a user
   * @param userId - User ID
   */
  async clearPin(userId: string): Promise<void> {
    if (!this.prisma) {
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash: null },
    });
  }
}
