/**
 * Password Service - bcrypt password hashing with security best practices
 * Story 1.1: JWT Login Endpoint
 * AC2: bcrypt password hashing (min 10 rounds), timing attack protection
 *
 * Security requirements (ADR-032):
 * - Minimum 10 bcrypt rounds (default: 12)
 * - Constant-time comparison for timing attack protection
 * - Input validation to prevent empty/null passwords
 */

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/** Minimum bcrypt rounds per ADR-032 security requirements */
const MIN_BCRYPT_ROUNDS = 10;
/** Default bcrypt rounds for production use */
const DEFAULT_BCRYPT_ROUNDS = 12;

@Injectable()
export class PasswordService {
  private readonly rounds: number;

  constructor(rounds: number = DEFAULT_BCRYPT_ROUNDS) {
    // Enforce minimum rounds requirement
    this.rounds = Math.max(rounds, MIN_BCRYPT_ROUNDS);
  }

  /**
   * Hash a plain text password using bcrypt
   * @param password - Plain text password to hash
   * @returns Promise<string> - bcrypt hash
   * @throws Error if password is empty, null, or undefined
   */
  async hashPassword(password: string): Promise<string> {
    // Validate input - empty, null, undefined check
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(this.rounds);
    const hash = await bcrypt.hash(password, salt);

    return hash;
  }

  /**
   * Verify a plain text password against a bcrypt hash
   * Uses bcrypt.compare which is constant-time to prevent timing attacks
   * @param plainPassword - Plain text password to verify
   * @param hashedPassword - bcrypt hash to compare against
   * @returns Promise<boolean> - true if password matches, false otherwise
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    // Return false for empty passwords without throwing
    if (!plainPassword || plainPassword.length === 0) {
      return false;
    }

    // Validate hash format - bcrypt hashes start with $2a$, $2b$, or $2y$ (PHP origin)
    if (!hashedPassword || !hashedPassword.match(/^\$2[aby]\$/)) {
      return false;
    }

    try {
      // bcrypt.compare is constant-time (timing attack protection)
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      return isMatch;
    } catch {
      // Handle any bcrypt errors gracefully
      return false;
    }
  }
}
