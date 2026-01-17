import { z } from 'zod';

/**
 * Audit action types schema
 */
export const AuditActionSchema = z.enum([
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'IMPORT',
  'APPROVE',
  'REJECT',
  'OVERRIDE',
  'ARCHIVE',
]);

export type AuditActionDto = z.infer<typeof AuditActionSchema>;

/**
 * Entity types schema
 */
export const AuditEntityTypeSchema = z.enum([
  'USER',
  'TENANT',
  'PARTNER',
  'RENTAL',
  'RENTAL_EQUIPMENT',
  'SERVICE_ORDER',
  'INVOICE',
  'PAYMENT',
  'PRODUCT',
  'INVENTORY',
  'CONFIG',
  'LICENSE',
  'FEATURE_FLAG',
]);

export type AuditEntityTypeDto = z.infer<typeof AuditEntityTypeSchema>;

/**
 * Audit changes schema
 */
export const AuditChangesSchema = z.object({
  before: z.record(z.unknown()).optional(),
  after: z.record(z.unknown()).optional(),
  fields: z.array(z.string()).optional(),
});

export type AuditChangesDto = z.infer<typeof AuditChangesSchema>;

/**
 * Create audit entry input schema
 */
export const CreateAuditEntrySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  userEmail: z.string().email().optional(),
  userName: z.string().optional(),
  action: AuditActionSchema,
  entityType: AuditEntityTypeSchema,
  entityId: z.string().min(1, 'Entity ID is required'),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  reason: z.string().optional(),
  changes: AuditChangesSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAuditEntryDto = z.infer<typeof CreateAuditEntrySchema>;

/**
 * Audit query options schema
 */
export const AuditQuerySchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  userId: z.string().optional(),
  entityType: AuditEntityTypeSchema.optional(),
  entityId: z.string().optional(),
  action: AuditActionSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0),
  orderBy: z.enum(['timestamp', 'action', 'entityType']).optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
});

export type AuditQueryDto = z.infer<typeof AuditQuerySchema>;

/**
 * Audit entry response schema
 */
export const AuditEntryResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  userEmail: z.string().optional(),
  userName: z.string().optional(),
  action: AuditActionSchema,
  entityType: AuditEntityTypeSchema,
  entityId: z.string(),
  timestamp: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  reason: z.string().optional(),
  changes: AuditChangesSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

export type AuditEntryResponseDto = z.infer<typeof AuditEntryResponseSchema>;

/**
 * Audit query result schema
 */
export const AuditQueryResultSchema = z.object({
  entries: z.array(AuditEntryResponseSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type AuditQueryResultDto = z.infer<typeof AuditQueryResultSchema>;

/**
 * Validation helper for audit entry
 */
export function validateAuditEntry(data: unknown): CreateAuditEntryDto {
  return CreateAuditEntrySchema.parse(data);
}

/**
 * Validation helper for audit query
 */
export function validateAuditQuery(data: unknown): AuditQueryDto {
  return AuditQuerySchema.parse(data);
}
