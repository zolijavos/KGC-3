import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from './encryption.service';
import { EncryptedValue } from '../interfaces/encryption.interface';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  // Test keys (32 bytes = 64 hex chars for AES-256)
  // Using pseudo-random hex to pass entropy validation
  const testEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const testHmacKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  const testPreviousKey = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

  beforeEach(() => {
    encryptionService = new EncryptionService({
      encryptionKey: testEncryptionKey,
      hmacKey: testHmacKey,
      keyVersion: 1,
    });
  });

  describe('encrypt()', () => {
    it('should encrypt plaintext and return encrypted value', () => {
      const plaintext = 'sensitive@email.com';

      const result = encryptionService.encrypt(plaintext);

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('keyVersion');
      expect(result.keyVersion).toBe(1);
      expect(result.ciphertext).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same-value';

      const result1 = encryptionService.encrypt(plaintext);
      const result2 = encryptionService.encrypt(plaintext);

      expect(result1.ciphertext).not.toBe(result2.ciphertext);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should include key version in encrypted value', () => {
      const result = encryptionService.encrypt('test');

      expect(result.keyVersion).toBe(1);
    });

    it('should handle empty string', () => {
      const result = encryptionService.encrypt('');

      expect(result.ciphertext).toBeDefined();
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Tóth János 🔐';

      const result = encryptionService.encrypt(plaintext);

      expect(result.ciphertext).toBeDefined();
      expect(result.ciphertext.length).toBeGreaterThan(0);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);

      const result = encryptionService.encrypt(plaintext);

      expect(result.ciphertext).toBeDefined();
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted value back to original', () => {
      const plaintext = 'sensitive@email.com';
      const encrypted = encryptionService.encrypt(plaintext);

      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt unicode characters correctly', () => {
      const plaintext = 'Szabó Éva - Budapest, Váci út 123.';
      const encrypted = encryptionService.encrypt(plaintext);

      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encryptionService.encrypt('test');
      encrypted.ciphertext = 'tampered' + encrypted.ciphertext;

      expect(() => encryptionService.decrypt(encrypted)).toThrow();
    });

    it('should throw error for tampered auth tag', () => {
      const encrypted = encryptionService.encrypt('test');
      encrypted.authTag = Buffer.from('wrong-tag').toString('base64');

      expect(() => encryptionService.decrypt(encrypted)).toThrow();
    });

    it('should throw error for wrong IV', () => {
      const encrypted = encryptionService.encrypt('test');
      encrypted.iv = Buffer.alloc(12).toString('base64'); // Wrong IV

      expect(() => encryptionService.decrypt(encrypted)).toThrow();
    });
  });

  describe('hash()', () => {
    it('should generate deterministic hash', () => {
      const value = 'test@email.com';

      const hash1 = encryptionService.hash(value);
      const hash2 = encryptionService.hash(value);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different values', () => {
      const hash1 = encryptionService.hash('value1');
      const hash2 = encryptionService.hash('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should be case sensitive', () => {
      const hash1 = encryptionService.hash('Test');
      const hash2 = encryptionService.hash('test');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = encryptionService.hash('');

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('verifyHash()', () => {
    it('should verify matching hash', () => {
      const value = 'test@email.com';
      const hash = encryptionService.hash(value);

      const result = encryptionService.verifyHash(value, hash);

      expect(result).toBe(true);
    });

    it('should reject non-matching hash', () => {
      const hash = encryptionService.hash('original');

      const result = encryptionService.verifyHash('different', hash);

      expect(result).toBe(false);
    });
  });

  describe('key rotation', () => {
    // Strong rotation key with good entropy
    const rotationKey = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b';

    it('should get key rotation status', () => {
      const status = encryptionService.getKeyRotationStatus();

      expect(status.currentVersion).toBe(1);
      expect(status.pendingReEncryptionCount).toBe(0);
    });

    it('should rotate to new key', () => {
      encryptionService.rotateKey(rotationKey);
      const status = encryptionService.getKeyRotationStatus();

      expect(status.currentVersion).toBe(2);
      expect(status.previousVersion).toBe(1);
    });

    it('should re-encrypt with new key after rotation', () => {
      const plaintext = 'sensitive-data';
      const encrypted = encryptionService.encrypt(plaintext);

      // Rotate key
      encryptionService.rotateKey(rotationKey);

      // Re-encrypt
      const reEncrypted = encryptionService.reEncrypt(encrypted);

      expect(reEncrypted.keyVersion).toBe(2);

      // Should still decrypt correctly
      const decrypted = encryptionService.decrypt(reEncrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt old values with previous key after rotation', () => {
      const plaintext = 'old-data';
      const encrypted = encryptionService.encrypt(plaintext);

      // Rotate key
      encryptionService.rotateKey(rotationKey);

      // Should still decrypt old value
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('associated data', () => {
    it('should encrypt with associated data', () => {
      const plaintext = 'test';
      const associatedData = 'user-123';

      const encrypted = encryptionService.encrypt(plaintext, { associatedData });
      const decrypted = encryptionService.decrypt(encrypted, { associatedData });

      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with wrong associated data', () => {
      const plaintext = 'test';
      const encrypted = encryptionService.encrypt(plaintext, {
        associatedData: 'correct',
      });

      expect(() =>
        encryptionService.decrypt(encrypted, { associatedData: 'wrong' })
      ).toThrow();
    });
  });

  describe('weak key rejection', () => {
    it('should reject all-same-byte encryption key', () => {
      expect(
        () =>
          new EncryptionService({
            encryptionKey: 'a'.repeat(64), // Weak: all same character
            hmacKey: testHmacKey,
            keyVersion: 1,
          })
      ).toThrow('insufficient entropy');
    });

    it('should reject all-zero encryption key', () => {
      expect(
        () =>
          new EncryptionService({
            encryptionKey: '0'.repeat(64), // Weak: all zeros
            hmacKey: testHmacKey,
            keyVersion: 1,
          })
      ).toThrow('insufficient entropy');
    });

    it('should reject all-same-byte HMAC key', () => {
      expect(
        () =>
          new EncryptionService({
            encryptionKey: testEncryptionKey,
            hmacKey: 'f'.repeat(64), // Weak: all same character
            keyVersion: 1,
          })
      ).toThrow('insufficient entropy');
    });

    it('should reject weak key during rotation', () => {
      expect(() => encryptionService.rotateKey('b'.repeat(64))).toThrow(
        'insufficient entropy'
      );
    });
  });
});
