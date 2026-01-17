import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import {
  Contract,
  ContractSignature,
  ContractStatus,
  SignatureType,
} from '../interfaces/contract.interface';
import { RecordSignatureDto } from '../dto/contract.dto';

/**
 * @kgc/rental-contract - Signature Service
 * Story 15-3: Digitális Aláírás
 *
 * HIBRID fejlesztés:
 * - TDD KÖTELEZŐ: Aláírás validáció, hash generálás, integritás ellenőrzés
 * - TRADICIONÁLIS: Kép feldolgozás, API endpoints
 */

/** Minimum aláírás kép méret (byte) - 50 byte minimum a valós aláírásokhoz */
const MIN_SIGNATURE_SIZE = 50;

/** Maximum aláírás kép méret (5MB) */
const MAX_SIGNATURE_SIZE = 5 * 1024 * 1024;

/** Támogatott kép formátumok */
const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/jpg'];

/** HMAC kulcs környezeti változóból - production-ben titkosított key store-ból */
const SIGNATURE_HMAC_KEY = process.env['SIGNATURE_HMAC_KEY'] ?? 'dev-signature-key-change-in-production';

@Injectable()
export class SignatureService {
  private signatures: Map<string, ContractSignature> = new Map();
  private signatureIdCounter = 0;

  // ===========================================================================
  // TDD-KÖTELEZŐ METÓDUSOK - Biztonsági kritikus validációk
  // ===========================================================================

  /**
   * Aláírás kép validálása
   * TDD KÖTELEZŐ - Biztonsági kritikus
   *
   * @param signatureImage Base64 encoded image
   * @returns Validation result with detailed errors
   */
  validateSignatureImage(signatureImage: string): {
    isValid: boolean;
    errors: string[];
    imageSize?: number;
    imageFormat?: string;
  } {
    const errors: string[] = [];
    let imageSize = 0;
    let imageFormat: string | undefined;

    // Üres ellenőrzés
    if (!signatureImage || signatureImage.trim() === '') {
      errors.push('Signature image is required');
      return { isValid: false, errors };
    }

    // Data URI formátum ellenőrzés
    const dataUriMatch = signatureImage.match(/^data:(image\/[a-z]+);base64,(.+)$/i);

    if (dataUriMatch) {
      imageFormat = dataUriMatch[1];
      const base64Data = dataUriMatch[2];

      // Formátum ellenőrzés
      if (imageFormat && !SUPPORTED_IMAGE_FORMATS.includes(imageFormat.toLowerCase())) {
        errors.push(`Unsupported image format: ${imageFormat}. Supported: PNG, JPEG`);
      }

      // Méret számítás (base64 → byte)
      if (base64Data) {
        imageSize = Math.ceil((base64Data.length * 3) / 4);

        // Padding korrekció
        const paddingCount = (base64Data.match(/=+$/) ?? [''])[0].length;
        imageSize -= paddingCount;
      }
    } else {
      // Nyers base64 (data URI nélkül)
      try {
        // Base64 validitás ellenőrzés
        const base64Regex = /^[A-Za-z0-9+/]+=*$/;
        if (!base64Regex.test(signatureImage)) {
          errors.push('Invalid base64 encoding');
        } else {
          imageSize = Math.ceil((signatureImage.length * 3) / 4);
          const paddingCount = (signatureImage.match(/=+$/) ?? [''])[0].length;
          imageSize -= paddingCount;
        }
      } catch {
        errors.push('Failed to decode base64 image');
      }
    }

    // Méret validáció
    if (imageSize > 0) {
      if (imageSize < MIN_SIGNATURE_SIZE) {
        errors.push(`Signature image too small: ${imageSize} bytes (minimum: ${MIN_SIGNATURE_SIZE})`);
      }

      if (imageSize > MAX_SIGNATURE_SIZE) {
        errors.push(`Signature image too large: ${imageSize} bytes (maximum: ${MAX_SIGNATURE_SIZE / 1024 / 1024}MB)`);
      }
    }

    // Build result object conditionally to satisfy exactOptionalPropertyTypes
    const result: {
      isValid: boolean;
      errors: string[];
      imageSize?: number;
      imageFormat?: string;
    } = {
      isValid: errors.length === 0,
      errors,
    };
    if (imageSize > 0) {
      result.imageSize = imageSize;
    }
    if (imageFormat) {
      result.imageFormat = imageFormat;
    }
    return result;
  }

  /**
   * Aláírás hash generálása
   * TDD KÖTELEZŐ - Integritás biztosítás
   *
   * @param contractId Contract identifier
   * @param signatureImage Base64 signature image
   * @param signedAt Signing timestamp
   * @param signerName Signer's name
   * @returns HMAC-SHA256 hash
   */
  generateSignatureHash(
    contractId: string,
    signatureImage: string,
    signedAt: Date,
    signerName: string
  ): string {
    // Kanonikus formátum az aláírás adatoknak
    const dataToSign = [
      contractId,
      signatureImage,
      signedAt.toISOString(),
      signerName,
    ].join('|');

    // HMAC-SHA256 hash generálás
    const hmac = createHmac('sha256', SIGNATURE_HMAC_KEY);
    hmac.update(dataToSign);

    return hmac.digest('hex');
  }

  /**
   * Aláírás integritás ellenőrzése
   * TDD KÖTELEZŐ - Biztonsági kritikus
   *
   * @param signature Stored signature data
   * @param signatureImage Original signature image
   * @returns Verification result
   */
  verifySignatureIntegrity(
    signature: ContractSignature,
    signatureImage: string
  ): {
    isValid: boolean;
    error?: string;
  } {
    // Hash újraszámítás
    const recalculatedHash = this.generateSignatureHash(
      signature.contractId,
      signatureImage,
      signature.signedAt,
      signature.signerName
    );

    // Összehasonlítás timing-safe módon
    const isValid = this.timingSafeCompare(signature.signatureHash, recalculatedHash);

    if (!isValid) {
      return {
        isValid: false,
        error: 'Signature integrity check failed - data may have been tampered',
      };
    }

    return { isValid: true };
  }

  /**
   * Timing-safe string comparison
   * TDD KÖTELEZŐ - Biztonsági kritikus (timing attack prevention)
   *
   * SECURITY: Uses Node.js crypto.timingSafeEqual for constant-time comparison
   * Previous implementation had early return on length mismatch which leaked timing info
   */
  timingSafeCompare(a: string, b: string): boolean {
    // Convert strings to buffers for timingSafeEqual
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    // To prevent length oracle attacks, pad shorter buffer to match longer
    // This ensures constant-time comparison regardless of length difference
    const maxLength = Math.max(bufA.length, bufB.length);

    // If lengths differ, the comparison will fail, but we still do constant-time work
    if (bufA.length !== bufB.length) {
      // Create equal-length buffers with different content to ensure comparison fails
      // but takes the same time as a valid comparison
      const paddedA = Buffer.alloc(maxLength, 0);
      const paddedB = Buffer.alloc(maxLength, 1); // Different fill ensures false result
      bufA.copy(paddedA);
      bufB.copy(paddedB);
      timingSafeEqual(paddedA, paddedB); // Do the work but ignore result
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  }

  /**
   * Szerződés státusz ellenőrzés aláíráshoz
   * TDD KÖTELEZŐ - State machine validáció
   */
  validateContractForSigning(contract: Contract): {
    canSign: boolean;
    reason?: string;
  } {
    // Csak PENDING_SIGNATURE státuszú szerződés írható alá
    if (contract.status !== ContractStatus.PENDING_SIGNATURE) {
      const statusMessages: Record<ContractStatus, string> = {
        [ContractStatus.DRAFT]: 'Contract is still in draft - generate PDF first',
        [ContractStatus.SIGNED]: 'Contract is already signed',
        [ContractStatus.EXPIRED]: 'Contract has expired',
        [ContractStatus.ARCHIVED]: 'Contract is archived',
        [ContractStatus.CANCELLED]: 'Contract has been cancelled',
        [ContractStatus.PENDING_SIGNATURE]: '', // Won't reach here
      };

      return {
        canSign: false,
        reason: statusMessages[contract.status] || 'Invalid contract status',
      };
    }

    // PDF kell az aláíráshoz
    if (!contract.pdfPath) {
      return {
        canSign: false,
        reason: 'Contract PDF must be generated before signing',
      };
    }

    return { canSign: true };
  }

  // ===========================================================================
  // TRADICIONÁLIS METÓDUSOK - CRUD és API műveletek
  // ===========================================================================

  /**
   * Aláírás rögzítése
   */
  async recordSignature(
    contract: Contract,
    dto: RecordSignatureDto,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<ContractSignature> {
    // Szerződés státusz validáció
    const canSignResult = this.validateContractForSigning(contract);
    if (!canSignResult.canSign) {
      throw new BadRequestException(canSignResult.reason);
    }

    // Aláírás kép validáció (ha digitális)
    if (dto.type === SignatureType.DIGITAL && dto.signatureImage) {
      const imageValidation = this.validateSignatureImage(dto.signatureImage);
      if (!imageValidation.isValid) {
        throw new BadRequestException(
          `Invalid signature image: ${imageValidation.errors.join(', ')}`
        );
      }
    }

    const signedAt = new Date();
    const signatureImage = dto.signatureImage ?? '';

    // Hash generálás
    const signatureHash = this.generateSignatureHash(
      contract.id,
      signatureImage,
      signedAt,
      dto.signerName
    );

    const id = `sig_${++this.signatureIdCounter}_${Date.now()}`;

    // Build signature object conditionally to satisfy exactOptionalPropertyTypes
    const signature: ContractSignature = {
      id,
      contractId: contract.id,
      type: dto.type,
      signerName: dto.signerName,
      signedAt,
      signatureHash,
    };
    if (dto.signatureImage) {
      signature.signatureImage = dto.signatureImage;
    }
    if (dto.signerEmail) {
      signature.signerEmail = dto.signerEmail;
    }
    if (metadata.ipAddress) {
      signature.ipAddress = metadata.ipAddress;
    }
    if (metadata.userAgent) {
      signature.userAgent = metadata.userAgent;
    }

    this.signatures.set(id, signature);

    return signature;
  }

  /**
   * Aláírás lekérdezése szerződés alapján
   */
  async getSignatureByContractId(contractId: string): Promise<ContractSignature | null> {
    for (const signature of this.signatures.values()) {
      if (signature.contractId === contractId) {
        return signature;
      }
    }
    return null;
  }

  /**
   * Aláírás lekérdezése ID alapján
   */
  async getSignatureById(id: string): Promise<ContractSignature> {
    const signature = this.signatures.get(id);
    if (!signature) {
      throw new NotFoundException(`Signature not found: ${id}`);
    }
    return signature;
  }

  /**
   * Aláírás audit log készítése
   */
  createAuditRecord(signature: ContractSignature): {
    action: string;
    contractId: string;
    signatureId: string;
    signerName: string;
    signedAt: string;
    verificationHash: string;
    ipAddress?: string;
  } {
    const record: {
      action: string;
      contractId: string;
      signatureId: string;
      signerName: string;
      signedAt: string;
      verificationHash: string;
      ipAddress?: string;
    } = {
      action: 'CONTRACT_SIGNED',
      contractId: signature.contractId,
      signatureId: signature.id,
      signerName: signature.signerName,
      signedAt: signature.signedAt.toISOString(),
      verificationHash: this.createAuditHash(signature),
    };
    if (signature.ipAddress) {
      record.ipAddress = signature.ipAddress;
    }
    return record;
  }

  /**
   * Audit hash létrehozása (külön az aláírás hash-től)
   */
  private createAuditHash(signature: ContractSignature): string {
    const auditData = [
      signature.id,
      signature.contractId,
      signature.signerName,
      signature.signedAt.toISOString(),
      signature.signatureHash,
    ].join(':');

    return createHash('sha256').update(auditData).digest('hex').substring(0, 16);
  }
}
