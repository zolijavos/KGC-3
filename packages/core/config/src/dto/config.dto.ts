import { z } from 'zod';

/**
 * Zod schema for config value types
 */
export const ConfigValueTypeSchema = z.enum(['string', 'number', 'boolean', 'json']);
export type ConfigValueTypeDto = z.infer<typeof ConfigValueTypeSchema>;

/**
 * Create config entry DTO
 */
export const CreateConfigEntrySchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(255, 'Key must be less than 255 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Key can only contain letters, numbers, dots, underscores, and hyphens'),
  value: z.string(),
  type: ConfigValueTypeSchema,
  description: z.string().max(500).optional(),
  isSystem: z.boolean().default(false),
  tenantId: z.string().uuid().optional(),
});

export type CreateConfigEntryDto = z.infer<typeof CreateConfigEntrySchema>;

/**
 * Update config entry DTO
 */
export const UpdateConfigEntrySchema = z.object({
  value: z.string().optional(),
  type: ConfigValueTypeSchema.optional(),
  description: z.string().max(500).optional(),
});

export type UpdateConfigEntryDto = z.infer<typeof UpdateConfigEntrySchema>;

/**
 * Config entry response DTO
 */
export const ConfigEntryResponseSchema = z.object({
  key: z.string(),
  value: z.string(),
  type: ConfigValueTypeSchema,
  description: z.string().nullable(),
  isSystem: z.boolean(),
  tenantId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ConfigEntryResponseDto = z.infer<typeof ConfigEntryResponseSchema>;

/**
 * Feature flag DTO
 */
export const CreateFeatureFlagSchema = z.object({
  key: z
    .string()
    .min(1, 'Key is required')
    .max(255, 'Key must be less than 255 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Key can only contain letters, numbers, dots, underscores, and hyphens'),
  enabled: z.boolean().default(false),
  description: z.string().max(500).optional(),
  tenantId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateFeatureFlagDto = z.infer<typeof CreateFeatureFlagSchema>;

/**
 * Update feature flag DTO
 */
export const UpdateFeatureFlagSchema = z.object({
  enabled: z.boolean().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpdateFeatureFlagDto = z.infer<typeof UpdateFeatureFlagSchema>;

/**
 * Feature flag response DTO
 */
export const FeatureFlagResponseSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  tenantId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type FeatureFlagResponseDto = z.infer<typeof FeatureFlagResponseSchema>;

/**
 * Validation helper
 */
export function validateConfigEntry(data: unknown): CreateConfigEntryDto {
  return CreateConfigEntrySchema.parse(data);
}

export function validateFeatureFlag(data: unknown): CreateFeatureFlagDto {
  return CreateFeatureFlagSchema.parse(data);
}
