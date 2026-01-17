import { z } from 'zod';
import { ContractTemplateType, ContractStatus, SignatureType } from '../interfaces/contract.interface';

/**
 * @kgc/rental-contract - Contract DTOs with Zod validation
 * Epic 15: Szerződés kezelés DTOs
 */

// =============================================================================
// TEMPLATE DTOs
// =============================================================================

/**
 * Template létrehozás DTO
 */
export const CreateTemplateDto = z.object({
  name: z.string().min(3).max(100),
  type: z.nativeEnum(ContractTemplateType),
  content: z.string().min(10).max(100000),
  isActive: z.boolean().default(true),
});

export type CreateTemplateDto = z.infer<typeof CreateTemplateDto>;

/**
 * Template frissítés DTO
 */
export const UpdateTemplateDto = z.object({
  name: z.string().min(3).max(100).optional(),
  content: z.string().min(10).max(100000).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTemplateDto = z.infer<typeof UpdateTemplateDto>;

/**
 * Template lista szűrő
 */
export const ListTemplatesDto = z.object({
  type: z.nativeEnum(ContractTemplateType).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ListTemplatesDto = z.infer<typeof ListTemplatesDto>;

// =============================================================================
// CONTRACT GENERATION DTOs
// =============================================================================

/**
 * Szerződés generálás DTO
 */
export const GenerateContractDto = z.object({
  templateId: z.string().uuid(),
  rentalId: z.string().uuid(),
  /** Egyedi változók felülírása */
  variableOverrides: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  /** PDF generálás opciók */
  pdfOptions: z
    .object({
      pageSize: z.enum(['A4', 'LETTER']).default('A4'),
      watermark: z.string().optional(),
    })
    .optional(),
});

export type GenerateContractDto = z.infer<typeof GenerateContractDto>;

/**
 * Szerződés PDF újragenerálás
 */
export const RegeneratePdfDto = z.object({
  contractId: z.string().uuid(),
  watermark: z.string().optional(),
});

export type RegeneratePdfDto = z.infer<typeof RegeneratePdfDto>;

// =============================================================================
// SIGNATURE DTOs
// =============================================================================

/**
 * Digitális aláírás rögzítés DTO
 */
export const RecordSignatureDto = z.object({
  contractId: z.string().uuid(),
  type: z.nativeEnum(SignatureType),
  /** Base64 encoded signature image (PNG/JPEG) */
  signatureImage: z
    .string()
    .refine(
      (val) => {
        // Validate base64 image format
        const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
        return base64Regex.test(val) || /^[A-Za-z0-9+/]+=*$/.test(val);
      },
      { message: 'Invalid base64 image format' }
    )
    .optional(),
  signerName: z.string().min(2).max(100),
  signerEmail: z.string().email().optional(),
});

export type RecordSignatureDto = z.infer<typeof RecordSignatureDto>;

/**
 * Aláírás validáció eredmény
 */
export const SignatureValidationResultDto = z.object({
  isValid: boolean(),
  contractId: z.string().uuid(),
  signatureHash: z.string(),
  verifiedAt: z.date(),
  errors: z.array(z.string()),
});

// Zod boolean helper
function boolean() {
  return z.boolean();
}

export type SignatureValidationResultDto = z.infer<typeof SignatureValidationResultDto>;

// =============================================================================
// ARCHIVE DTOs
// =============================================================================

/**
 * Szerződés archiválás DTO
 */
export const ArchiveContractDto = z.object({
  contractId: z.string().uuid(),
  /** Retention period években (default: 10 év) */
  retentionYears: z.number().int().min(1).max(100).default(10),
});

export type ArchiveContractDto = z.infer<typeof ArchiveContractDto>;

/**
 * Archivált szerződés lekérdezés
 */
export const GetArchivedContractDto = z.object({
  contractId: z.string().uuid().optional(),
  rentalId: z.string().uuid().optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type GetArchivedContractDto = z.infer<typeof GetArchivedContractDto>;

// =============================================================================
// RESPONSE DTOs
// =============================================================================

/**
 * Template response
 */
export const TemplateResponseDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(ContractTemplateType),
  availableVariables: z.array(z.string()),
  version: z.number(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TemplateResponseDto = z.infer<typeof TemplateResponseDto>;

/**
 * Contract response
 */
export const ContractResponseDto = z.object({
  id: z.string().uuid(),
  contractNumber: z.string(),
  rentalId: z.string().uuid(),
  templateId: z.string().uuid(),
  status: z.nativeEnum(ContractStatus),
  pdfUrl: z.string().url().optional(),
  hasSignature: z.boolean(),
  signedAt: z.date().optional(),
  createdAt: z.date(),
});

export type ContractResponseDto = z.infer<typeof ContractResponseDto>;

/**
 * PDF letöltés response
 */
export const PdfDownloadResponseDto = z.object({
  contractId: z.string().uuid(),
  downloadUrl: z.string().url(),
  expiresAt: z.date(),
  filename: z.string(),
  contentType: z.literal('application/pdf'),
  fileSize: z.number(),
});

export type PdfDownloadResponseDto = z.infer<typeof PdfDownloadResponseDto>;
