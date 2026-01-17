/**
 * Encryption Interfaces
 * FR67: PII titkosítás adatbázisban - GDPR megfelelőség
 */

/**
 * PII field types that should be encrypted
 */
export type PIIFieldType = 'email' | 'phone' | 'address' | 'taxId' | 'name' | 'ssn' | 'bankAccount';

/**
 * Encrypted value structure
 */
export interface EncryptedValue {
  /** Base64 encoded encrypted data */
  ciphertext: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Base64 encoded authentication tag (for GCM) */
  authTag: string;
  /** Key version used for encryption (for key rotation) */
  keyVersion: number;
}

/**
 * Options for encryption
 */
export interface EncryptOptions {
  /** Key version to use (default: current) */
  keyVersion?: number;
  /** Associated data for authenticated encryption */
  associatedData?: string;
}

/**
 * Options for decryption
 */
export interface DecryptOptions {
  /** Associated data that was used during encryption */
  associatedData?: string;
}

/**
 * Key rotation status
 */
export interface KeyRotationStatus {
  currentVersion: number;
  previousVersion?: number;
  rotatedAt?: Date;
  pendingReEncryptionCount: number;
}

/**
 * Encryption service interface
 */
export interface IEncryptionService {
  /**
   * Encrypt a plaintext value
   */
  encrypt(plaintext: string, options?: EncryptOptions): EncryptedValue;

  /**
   * Decrypt an encrypted value
   */
  decrypt(encrypted: EncryptedValue, options?: DecryptOptions): string;

  /**
   * Generate a deterministic hash for searchable encryption
   * Uses HMAC-SHA256 for consistent hashing of same values
   */
  hash(value: string): string;

  /**
   * Verify if a plaintext matches a hash
   */
  verifyHash(value: string, hash: string): boolean;

  /**
   * Re-encrypt a value with the current key (for key rotation)
   */
  reEncrypt(encrypted: EncryptedValue, options?: DecryptOptions): EncryptedValue;

  /**
   * Get current key rotation status
   */
  getKeyRotationStatus(): KeyRotationStatus;

  /**
   * Rotate to a new encryption key
   */
  rotateKey(newKeyHex: string): void;
}

/**
 * Configuration for encryption service
 */
export interface EncryptionConfig {
  /** Primary encryption key (32 bytes, hex encoded) */
  encryptionKey: string;
  /** Previous encryption key for rotation (optional) */
  previousKey?: string;
  /** Key version (incremented on rotation) */
  keyVersion: number;
  /** HMAC key for deterministic hashing */
  hmacKey: string;
}

/**
 * Decorator metadata for encrypted fields
 */
export interface EncryptedFieldMetadata {
  fieldName: string;
  fieldType: PIIFieldType;
  searchable: boolean;
}
