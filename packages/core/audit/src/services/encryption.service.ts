import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, createHmac, timingSafeEqual } from 'crypto';
import type {
  IEncryptionService,
  EncryptedValue,
  EncryptOptions,
  DecryptOptions,
  KeyRotationStatus,
  EncryptionConfig,
} from '../interfaces/encryption.interface';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encryption Service - AES-256-GCM encryption for PII data
 * FR67: PII titkosítás adatbázisban - GDPR megfelelőség
 */
@Injectable()
export class EncryptionService implements IEncryptionService {
  private currentKey: Buffer;
  private previousKey: Buffer | null = null;
  private hmacKey: Buffer;
  private keyVersion: number;
  private previousKeyVersion: number | undefined;
  private rotatedAt: Date | undefined;

  constructor(config: EncryptionConfig) {
    this.currentKey = Buffer.from(config.encryptionKey, 'hex');
    this.hmacKey = Buffer.from(config.hmacKey, 'hex');
    this.keyVersion = config.keyVersion;

    if (config.previousKey) {
      this.previousKey = Buffer.from(config.previousKey, 'hex');
      this.previousKeyVersion = config.keyVersion - 1;
    }

    // Validate key lengths
    if (this.currentKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }
    if (this.hmacKey.length !== 32) {
      throw new Error('HMAC key must be 32 bytes (64 hex characters)');
    }

    // Validate key entropy (reject weak/predictable keys)
    if (this.isWeakKey(this.currentKey)) {
      throw new Error('Encryption key has insufficient entropy - use cryptographically random key');
    }
    if (this.isWeakKey(this.hmacKey)) {
      throw new Error('HMAC key has insufficient entropy - use cryptographically random key');
    }
  }

  /**
   * Check if a key has weak/predictable entropy
   * Detects all-zero, all-same-byte, and sequential patterns
   */
  private isWeakKey(key: Buffer): boolean {
    // Check if all bytes are the same
    const firstByte = key[0];
    if (firstByte !== undefined && key.every((b) => b === firstByte)) {
      return true;
    }

    // Check for sequential pattern (0,1,2,3... or 255,254,253...)
    let isAscending = true;
    let isDescending = true;
    for (let i = 1; i < key.length; i++) {
      const prev = key[i - 1];
      const curr = key[i];
      if (prev === undefined || curr === undefined) break;
      if (curr !== (prev + 1) % 256) isAscending = false;
      if (curr !== (prev - 1 + 256) % 256) isDescending = false;
    }
    if (isAscending || isDescending) {
      return true;
    }

    return false;
  }

  /**
   * Encrypt a plaintext value using AES-256-GCM
   *
   * Security considerations:
   * - Uses random IV for each encryption (never reuse IVs!)
   * - GCM provides both confidentiality and authenticity
   * - Use associatedData to bind ciphertext to context (e.g., userId, tenantId)
   *   This prevents ciphertext from being moved between records
   *
   * @param plaintext - The value to encrypt
   * @param options - Optional encryption settings
   * @param options.keyVersion - Override key version (default: current)
   * @param options.associatedData - Context data for authenticated encryption (recommended for PII)
   * @returns Encrypted value with IV, auth tag, and key version
   *
   * @example
   * // Basic encryption
   * const encrypted = service.encrypt('sensitive@email.com');
   *
   * // With associated data (recommended for database records)
   * const encrypted = service.encrypt('sensitive@email.com', {
   *   associatedData: `user:${userId}:tenant:${tenantId}`
   * });
   */
  encrypt(plaintext: string, options: EncryptOptions = {}): EncryptedValue {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.currentKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Add associated data if provided (for authenticated encryption)
    if (options.associatedData) {
      cipher.setAAD(Buffer.from(options.associatedData, 'utf8'));
    }

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: options.keyVersion ?? this.keyVersion,
    };
  }

  /**
   * Decrypt an encrypted value
   *
   * Security considerations:
   * - Automatically selects correct key based on keyVersion (supports rotation)
   * - Validates authenticity via GCM auth tag before returning plaintext
   * - If associatedData was used during encryption, it MUST be provided here
   *
   * @param encrypted - The encrypted value object
   * @param options - Decryption options
   * @param options.associatedData - Must match what was used during encryption
   * @returns The decrypted plaintext string
   * @throws Error if ciphertext is tampered, auth tag invalid, or associatedData mismatch
   *
   * @example
   * // Basic decryption
   * const plaintext = service.decrypt(encrypted);
   *
   * // With associated data (must match encryption)
   * const plaintext = service.decrypt(encrypted, {
   *   associatedData: `user:${userId}:tenant:${tenantId}`
   * });
   */
  decrypt(encrypted: EncryptedValue, options: DecryptOptions = {}): string {
    // Determine which key to use based on key version
    const key = this.getKeyForVersion(encrypted.keyVersion);

    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    // Add associated data if provided
    if (options.associatedData) {
      decipher.setAAD(Buffer.from(options.associatedData, 'utf8'));
    }

    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch {
      throw new Error('Decryption failed: invalid ciphertext or authentication tag');
    }
  }

  /**
   * Generate a deterministic hash for searchable encryption
   * Uses HMAC-SHA256 for consistent hashing
   */
  hash(value: string): string {
    const hmac = createHmac('sha256', this.hmacKey);
    hmac.update(value, 'utf8');
    return hmac.digest('base64');
  }

  /**
   * Verify if a plaintext matches a hash using timing-safe comparison
   */
  verifyHash(value: string, hash: string): boolean {
    const computed = this.hash(value);
    const computedBuffer = Buffer.from(computed, 'base64');
    const hashBuffer = Buffer.from(hash, 'base64');

    if (computedBuffer.length !== hashBuffer.length) {
      return false;
    }

    return timingSafeEqual(computedBuffer, hashBuffer);
  }

  /**
   * Re-encrypt a value with the current key (for key rotation)
   */
  reEncrypt(encrypted: EncryptedValue, options: DecryptOptions = {}): EncryptedValue {
    // Decrypt with appropriate key
    const plaintext = this.decrypt(encrypted, options);

    // Re-encrypt with current key
    return this.encrypt(plaintext);
  }

  /**
   * Get current key rotation status
   */
  getKeyRotationStatus(): KeyRotationStatus {
    const status: KeyRotationStatus = {
      currentVersion: this.keyVersion,
      pendingReEncryptionCount: 0, // Would need external tracking
    };
    if (this.previousKeyVersion !== undefined) {
      status.previousVersion = this.previousKeyVersion;
    }
    if (this.rotatedAt !== undefined) {
      status.rotatedAt = this.rotatedAt;
    }
    return status;
  }

  /**
   * Rotate to a new encryption key
   * Security: Old previous key is zeroed to prevent memory leakage
   */
  rotateKey(newKeyHex: string): void {
    const newKey = Buffer.from(newKeyHex, 'hex');

    if (newKey.length !== 32) {
      throw new Error('New encryption key must be 32 bytes (64 hex characters)');
    }

    // Validate new key entropy
    if (this.isWeakKey(newKey)) {
      throw new Error('New encryption key has insufficient entropy - use cryptographically random key');
    }

    // Zero out old previous key before overwriting (security best practice)
    if (this.previousKey) {
      this.previousKey.fill(0);
    }

    // Keep current key as previous for decryption
    this.previousKey = this.currentKey;
    this.previousKeyVersion = this.keyVersion;

    // Set new key
    this.currentKey = newKey;
    this.keyVersion += 1;
    this.rotatedAt = new Date();
  }

  /**
   * Get the appropriate key for a given version
   */
  private getKeyForVersion(version: number): Buffer {
    if (version === this.keyVersion) {
      return this.currentKey;
    }

    if (this.previousKey && version === this.previousKeyVersion) {
      return this.previousKey;
    }

    throw new Error(`No key available for version ${version}`);
  }
}
