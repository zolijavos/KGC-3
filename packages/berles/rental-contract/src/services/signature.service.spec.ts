import { describe, it, expect, beforeEach } from 'vitest';
import { SignatureService } from './signature.service';
import { Contract, ContractStatus, SignatureType } from '../interfaces/contract.interface';

/**
 * @kgc/rental-contract - SignatureService Unit Tests
 * TDD-KÖTELEZŐ tesztek a biztonsági kritikus validációkhoz
 *
 * Test categories:
 * 1. validateSignatureImage() - kép validáció
 * 2. generateSignatureHash() - hash generálás
 * 3. verifySignatureIntegrity() - integritás ellenőrzés
 * 4. timingSafeCompare() - timing attack prevention
 * 5. validateContractForSigning() - státusz validáció
 */

describe('SignatureService', () => {
  let service: SignatureService;

  beforeEach(() => {
    service = new SignatureService();
  });

  // ===========================================================================
  // validateSignatureImage() - TDD KÖTELEZŐ
  // ===========================================================================
  describe('validateSignatureImage()', () => {
    describe('valid inputs', () => {
      it('should accept valid PNG data URI', () => {
        // Small valid PNG (1x1 pixel)
        const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const result = service.validateSignatureImage(validPng);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.imageFormat).toBe('image/png');
        expect(result.imageSize).toBeGreaterThan(0);
      });

      it('should accept valid JPEG data URI', () => {
        // Small valid JPEG (1x1 pixel)
        const validJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==';

        const result = service.validateSignatureImage(validJpeg);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.imageFormat).toBe('image/jpeg');
      });

      it('should accept valid raw base64 (without data URI)', () => {
        // Raw base64 PNG data
        const rawBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const result = service.validateSignatureImage(rawBase64);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid inputs', () => {
      it('should reject empty string', () => {
        const result = service.validateSignatureImage('');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Signature image is required');
      });

      it('should reject null-like inputs', () => {
        const result = service.validateSignatureImage('   ');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Signature image is required');
      });

      it('should reject invalid base64 encoding', () => {
        const invalidBase64 = 'not-valid-base64!!!@@@###';

        const result = service.validateSignatureImage(invalidBase64);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid base64 encoding');
      });

      it('should reject unsupported image format (GIF)', () => {
        const gifDataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

        const result = service.validateSignatureImage(gifDataUri);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('Unsupported image format'))).toBe(true);
      });

      it('should reject image too small (under minimum size)', () => {
        // Very small base64 that decodes to less than MIN_SIGNATURE_SIZE
        const tinyImage = 'data:image/png;base64,iVBO';

        const result = service.validateSignatureImage(tinyImage);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('too small'))).toBe(true);
      });

      it('should reject image too large (over 5MB)', () => {
        // Create a very large base64 string (simulating > 5MB)
        const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(7 * 1024 * 1024);

        const result = service.validateSignatureImage(largeBase64);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('too large'))).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle base64 with padding correctly', () => {
        // Base64 with different padding scenarios
        const withSinglePadding = 'data:image/png;base64,aGVsbG8gd29ybGQh'; // No padding
        const withDoublePadding = 'data:image/png;base64,aGVsbG8gd29ybGQ='; // Single =
        const withTriplePadding = 'data:image/png;base64,aGVsbG8gd29ybA=='; // Double ==

        // All should parse without crashing
        expect(() => service.validateSignatureImage(withSinglePadding)).not.toThrow();
        expect(() => service.validateSignatureImage(withDoublePadding)).not.toThrow();
        expect(() => service.validateSignatureImage(withTriplePadding)).not.toThrow();
      });
    });
  });

  // ===========================================================================
  // generateSignatureHash() - TDD KÖTELEZŐ
  // ===========================================================================
  describe('generateSignatureHash()', () => {
    const testContractId = 'contract_123';
    const testSignatureImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testSignedAt = new Date('2026-01-15T10:00:00.000Z');
    const testSignerName = 'Test User';

    it('should generate consistent hash for same inputs', () => {
      const hash1 = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        testSignedAt,
        testSignerName
      );

      const hash2 = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        testSignedAt,
        testSignerName
      );

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different contract IDs', () => {
      const hash1 = service.generateSignatureHash(
        'contract_123',
        testSignatureImage,
        testSignedAt,
        testSignerName
      );

      const hash2 = service.generateSignatureHash(
        'contract_456',
        testSignatureImage,
        testSignedAt,
        testSignerName
      );

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for different signature images', () => {
      const hash1 = service.generateSignatureHash(
        testContractId,
        'signature1',
        testSignedAt,
        testSignerName
      );

      const hash2 = service.generateSignatureHash(
        testContractId,
        'signature2',
        testSignedAt,
        testSignerName
      );

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for different timestamps', () => {
      const hash1 = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        new Date('2026-01-15T10:00:00.000Z'),
        testSignerName
      );

      const hash2 = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        new Date('2026-01-15T10:00:01.000Z'), // 1 second later
        testSignerName
      );

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash for different signer names', () => {
      const hash1 = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        testSignedAt,
        'User A'
      );

      const hash2 = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        testSignedAt,
        'User B'
      );

      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hash (SHA-256)', () => {
      const hash = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        testSignedAt,
        testSignerName
      );

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ===========================================================================
  // verifySignatureIntegrity() - TDD KÖTELEZŐ
  // ===========================================================================
  describe('verifySignatureIntegrity()', () => {
    const testContractId = 'contract_123';
    const testSignatureImage = 'test-signature-image-data';
    const testSignedAt = new Date('2026-01-15T10:00:00.000Z');
    const testSignerName = 'Test User';

    it('should return valid for matching signature', () => {
      const hash = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        testSignedAt,
        testSignerName
      );

      const signature = {
        id: 'sig_1',
        contractId: testContractId,
        type: SignatureType.DIGITAL,
        signerName: testSignerName,
        signedAt: testSignedAt,
        signatureHash: hash,
      };

      const result = service.verifySignatureIntegrity(signature, testSignatureImage);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for tampered signature image', () => {
      const hash = service.generateSignatureHash(
        testContractId,
        testSignatureImage,
        testSignedAt,
        testSignerName
      );

      const signature = {
        id: 'sig_1',
        contractId: testContractId,
        type: SignatureType.DIGITAL,
        signerName: testSignerName,
        signedAt: testSignedAt,
        signatureHash: hash,
      };

      // Try to verify with different image
      const result = service.verifySignatureIntegrity(signature, 'tampered-signature-data');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('integrity check failed');
    });

    it('should return invalid for tampered hash', () => {
      const signature = {
        id: 'sig_1',
        contractId: testContractId,
        type: SignatureType.DIGITAL,
        signerName: testSignerName,
        signedAt: testSignedAt,
        signatureHash: 'tampered_hash_value_that_does_not_match_anything_at_all_here',
      };

      const result = service.verifySignatureIntegrity(signature, testSignatureImage);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('tampered');
    });
  });

  // ===========================================================================
  // timingSafeCompare() - TDD KÖTELEZŐ
  // ===========================================================================
  describe('timingSafeCompare()', () => {
    it('should return true for equal strings', () => {
      expect(service.timingSafeCompare('hello', 'hello')).toBe(true);
      expect(service.timingSafeCompare('', '')).toBe(true);
      expect(service.timingSafeCompare('abc123', 'abc123')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(service.timingSafeCompare('hello', 'world')).toBe(false);
      expect(service.timingSafeCompare('hello', 'hello!')).toBe(false);
      expect(service.timingSafeCompare('abc', 'abd')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(service.timingSafeCompare('short', 'longer string')).toBe(false);
      expect(service.timingSafeCompare('abc', 'ab')).toBe(false);
    });

    it('should handle special characters', () => {
      expect(service.timingSafeCompare('hello@world!', 'hello@world!')).toBe(true);
      expect(service.timingSafeCompare('hello@world!', 'hello@world?')).toBe(false);
    });

    it('should handle unicode characters', () => {
      expect(service.timingSafeCompare('áéíóú', 'áéíóú')).toBe(true);
      expect(service.timingSafeCompare('áéíóú', 'aeiou')).toBe(false);
    });
  });

  // ===========================================================================
  // validateContractForSigning() - TDD KÖTELEZŐ
  // ===========================================================================
  describe('validateContractForSigning()', () => {
    const createMockContract = (status: ContractStatus, pdfPath?: string): Contract => ({
      id: 'contract_1',
      tenantId: 'tenant_1',
      rentalId: 'rental_1',
      templateId: 'template_1',
      contractNumber: 'KGC-2026-00001',
      status,
      variables: {
        partnerName: 'Test Partner',
        partnerAddress: 'Test Address',
        equipmentName: 'Test Equipment',
        rentalId: 'rental_1',
        rentalStartDate: '2026. január 15.',
        rentalDailyRate: 10000,
        companyName: 'Test Company',
        companyAddress: 'Company Address',
        companyTaxNumber: '12345678-2-42',
        currentDate: '2026. január 15.',
        contractNumber: 'KGC-2026-00001',
      },
      pdfPath,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user_1',
    });

    it('should allow signing PENDING_SIGNATURE contract with PDF', () => {
      const contract = createMockContract(ContractStatus.PENDING_SIGNATURE, '/path/to/pdf');

      const result = service.validateContractForSigning(contract);

      expect(result.canSign).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject DRAFT contract', () => {
      const contract = createMockContract(ContractStatus.DRAFT, '/path/to/pdf');

      const result = service.validateContractForSigning(contract);

      expect(result.canSign).toBe(false);
      expect(result.reason).toContain('draft');
    });

    it('should reject already SIGNED contract', () => {
      const contract = createMockContract(ContractStatus.SIGNED, '/path/to/pdf');

      const result = service.validateContractForSigning(contract);

      expect(result.canSign).toBe(false);
      expect(result.reason).toContain('already signed');
    });

    it('should reject EXPIRED contract', () => {
      const contract = createMockContract(ContractStatus.EXPIRED, '/path/to/pdf');

      const result = service.validateContractForSigning(contract);

      expect(result.canSign).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should reject ARCHIVED contract', () => {
      const contract = createMockContract(ContractStatus.ARCHIVED, '/path/to/pdf');

      const result = service.validateContractForSigning(contract);

      expect(result.canSign).toBe(false);
      expect(result.reason).toContain('archived');
    });

    it('should reject CANCELLED contract', () => {
      const contract = createMockContract(ContractStatus.CANCELLED, '/path/to/pdf');

      const result = service.validateContractForSigning(contract);

      expect(result.canSign).toBe(false);
      expect(result.reason).toContain('cancelled');
    });

    it('should reject PENDING_SIGNATURE contract without PDF', () => {
      const contract = createMockContract(ContractStatus.PENDING_SIGNATURE, undefined);

      const result = service.validateContractForSigning(contract);

      expect(result.canSign).toBe(false);
      expect(result.reason).toContain('PDF must be generated');
    });
  });
});
