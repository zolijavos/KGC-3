/**
 * @kgc/rental-contract - Contract Interfaces
 * Epic 15: Bérlési szerződés template kezelés, PDF generálás, digitális aláírás
 */

/**
 * Szerződés template típusok
 */
export enum ContractTemplateType {
  /** Standard bérlési szerződés */
  RENTAL_STANDARD = 'RENTAL_STANDARD',
  /** Hosszú távú bérlés szerződés (havi számlázás) */
  RENTAL_LONG_TERM = 'RENTAL_LONG_TERM',
  /** Céges keretszerződés */
  RENTAL_CORPORATE = 'RENTAL_CORPORATE',
  /** Kaució megállapodás */
  DEPOSIT_AGREEMENT = 'DEPOSIT_AGREEMENT',
}

/**
 * Szerződés státusz
 */
export enum ContractStatus {
  /** Piszkozat, nem véglegesített */
  DRAFT = 'DRAFT',
  /** Generálva, aláírásra vár */
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  /** Aláírva, aktív */
  SIGNED = 'SIGNED',
  /** Lejárt */
  EXPIRED = 'EXPIRED',
  /** Archivált */
  ARCHIVED = 'ARCHIVED',
  /** Érvénytelenített */
  CANCELLED = 'CANCELLED',
}

/**
 * Aláírás típus
 */
export enum SignatureType {
  /** Digitális aláírás (touch/stylus) */
  DIGITAL = 'DIGITAL',
  /** Papír alapú (szkennelt) */
  SCANNED = 'SCANNED',
  /** E-aláírás szolgáltató */
  E_SIGNATURE = 'E_SIGNATURE',
}

/**
 * Szerződés template interface
 */
export interface ContractTemplate {
  id: string;
  tenantId: string;
  name: string;
  type: ContractTemplateType;
  /** HTML vagy Markdown template tartalom */
  content: string;
  /** Elérhető változók: {{partnerName}}, {{equipmentName}}, stb. */
  availableVariables: string[];
  /** Verzió szám */
  version: number;
  /** Aktív-e ez a template */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Template változó értékek
 */
export interface ContractVariables {
  // Partner adatok
  partnerName: string;
  partnerAddress: string;
  partnerTaxNumber?: string;
  partnerPhone?: string;
  partnerEmail?: string;

  // Bérlés adatok
  rentalId: string;
  rentalStartDate: string;
  rentalEndDate?: string;
  rentalDailyRate: number;
  rentalTotalAmount?: number;

  // Bérgép adatok
  equipmentName: string;
  equipmentSerialNumber?: string;
  equipmentCondition?: string;

  // Kaució
  depositAmount?: number;
  depositMethod?: string;

  // Tenant adatok
  companyName: string;
  companyAddress: string;
  companyTaxNumber: string;
  companyPhone?: string;

  // Egyéb
  currentDate: string;
  contractNumber: string;
  [key: string]: string | number | undefined;
}

/**
 * Generált szerződés interface
 */
export interface Contract {
  id: string;
  tenantId: string;
  rentalId: string;
  templateId: string;
  contractNumber: string;
  status: ContractStatus;
  /** Kitöltött változók snapshot */
  variables: ContractVariables;
  /** PDF fájl path (S3/MinIO) */
  pdfPath?: string;
  /** PDF generálás időpontja */
  pdfGeneratedAt?: Date;
  /** Aláírás adatok */
  signature?: ContractSignature;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Digitális aláírás adatok
 */
export interface ContractSignature {
  id: string;
  contractId: string;
  type: SignatureType;
  /** Base64 kódolt aláírás kép (touch/stylus) */
  signatureImage?: string;
  /** Aláíró neve */
  signerName: string;
  /** Aláíró email */
  signerEmail?: string;
  /** Aláírás időpontja */
  signedAt: Date;
  /** IP cím */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Aláírás hash (integritás ellenőrzés) */
  signatureHash: string;
}

/**
 * Archivált szerződés metaadatok
 */
export interface ArchivedContract {
  id: string;
  contractId: string;
  tenantId: string;
  /** S3/MinIO bucket név */
  storageBucket: string;
  /** Fájl path a bucket-ben */
  storagePath: string;
  /** Fájl méret byte-ban */
  fileSize: number;
  /** Content hash (SHA-256) */
  contentHash: string;
  /** Archiválás időpontja */
  archivedAt: Date;
  /** Retention policy (meddig őrizzük) */
  retentionYears: number;
  /** Törlés tervezett időpontja */
  scheduledDeletionAt?: Date;
}

/**
 * PDF generálás opciók
 */
export interface PdfGenerationOptions {
  /** A4 vagy egyéb méret */
  pageSize?: 'A4' | 'LETTER';
  /** Margók mm-ben */
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Fejléc logó path */
  headerLogoPath?: string;
  /** Lábléc szöveg */
  footerText?: string;
  /** Vízjel (pl. "PISZKOZAT") */
  watermark?: string;
}

/**
 * Template validációs eredmény
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: TemplateValidationError[];
  warnings: string[];
  /** Talált változók a template-ben */
  foundVariables: string[];
  /** Hiányzó kötelező változók */
  missingRequiredVariables: string[];
}

export interface TemplateValidationError {
  line?: number;
  column?: number;
  message: string;
  variableName?: string;
}
