/**
 * @kgc/twenty-crm - Twenty CRM DTOs
 * Epic 28: Twenty CRM Integration
 */

import { z } from 'zod';

export const SyncDirectionEnum = z.enum(['KGC_TO_CRM', 'CRM_TO_KGC', 'BIDIRECTIONAL']);
export const EntityTypeEnum = z.enum(['PARTNER', 'CONTACT', 'COMPANY', 'DEAL', 'NOTE', 'ACTIVITY']);

export const SyncPartnersSchema = z.object({
  direction: SyncDirectionEnum.default('KGC_TO_CRM'),
  partnerIds: z.array(z.string().uuid()).optional(),
  fullSync: z.boolean().default(false),
  includeContacts: z.boolean().default(true),
  includeDeals: z.boolean().default(false),
  includeActivities: z.boolean().default(false),
});

export const CreatePartnerMappingSchema = z.object({
  kgcPartnerId: z.string().uuid(),
  crmPartnerId: z.string().min(1),
});

export const UpdatePartnerMappingSchema = z.object({
  crmPartnerId: z.string().min(1).optional(),
  syncStatus: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL']).optional(),
});

export const SyncContactsSchema = z.object({
  partnerId: z.string().uuid(),
  direction: SyncDirectionEnum.default('KGC_TO_CRM'),
});

export const CreateDashboardConfigSchema = z.object({
  name: z.string().min(1).max(100),
  crmDashboardId: z.string().min(1),
  embedUrl: z.string().url(),
  width: z.string().max(20).optional(),
  height: z.string().max(20).optional(),
  refreshInterval: z.number().int().min(30).max(3600).optional(),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const UpdateDashboardConfigSchema = CreateDashboardConfigSchema.partial();

export const GenerateEmbedTokenSchema = z.object({
  dashboardId: z.string().uuid(),
  expiresInMinutes: z.number().int().min(5).max(1440).default(60),
});

export const WebhookPayloadSchema = z.object({
  event: z.string().min(1),
  entityType: EntityTypeEnum,
  entityId: z.string().min(1),
  data: z.record(z.unknown()),
  timestamp: z.coerce.date(),
});

export type SyncPartnersDto = z.infer<typeof SyncPartnersSchema>;
export type CreatePartnerMappingDto = z.infer<typeof CreatePartnerMappingSchema>;
export type UpdatePartnerMappingDto = z.infer<typeof UpdatePartnerMappingSchema>;
export type SyncContactsDto = z.infer<typeof SyncContactsSchema>;
export type CreateDashboardConfigDto = z.infer<typeof CreateDashboardConfigSchema>;
export type UpdateDashboardConfigDto = z.infer<typeof UpdateDashboardConfigSchema>;
export type GenerateEmbedTokenDto = z.infer<typeof GenerateEmbedTokenSchema>;
export type WebhookPayloadDto = z.infer<typeof WebhookPayloadSchema>;
