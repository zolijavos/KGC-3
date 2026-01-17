import { z } from 'zod';
import { DEFAULT_TENANT_SETTINGS } from '../interfaces/tenant.interface';

/**
 * Start Onboarding DTO - Tenant Info (Step 1)
 */
export const startOnboardingSchema = z.object({
  name: z.string()
    .min(2, 'A név minimum 2 karakter')
    .max(100, 'A név maximum 100 karakter'),
  slug: z.string()
    .min(2, 'A slug minimum 2 karakter')
    .max(50, 'A slug maximum 50 karakter')
    .regex(/^[a-z0-9-]+$/, 'A slug csak kisbetűket, számokat és kötőjelet tartalmazhat'),
  contactEmail: z.string()
    .email('Érvénytelen email cím'),
  planType: z.enum(['basic', 'standard', 'premium']).optional().default('standard'),
});

export type StartOnboardingDto = z.infer<typeof startOnboardingSchema>;

export function validateStartOnboardingDto(data: unknown): StartOnboardingDto {
  return startOnboardingSchema.parse(data);
}

export function safeValidateStartOnboardingDto(data: unknown) {
  return startOnboardingSchema.safeParse(data);
}

/**
 * Admin User DTO (Step 2)
 */
export const adminUserSchema = z.object({
  name: z.string()
    .min(2, 'A név minimum 2 karakter')
    .max(100, 'A név maximum 100 karakter'),
  email: z.string()
    .email('Érvénytelen email cím'),
  password: z.string()
    .min(8, 'A jelszó minimum 8 karakter')
    .regex(/[A-Z]/, 'A jelszó tartalmazzon nagybetűt')
    .regex(/[a-z]/, 'A jelszó tartalmazzon kisbetűt')
    .regex(/[0-9]/, 'A jelszó tartalmazzon számot'),
});

export type AdminUserDto = z.infer<typeof adminUserSchema>;

export function validateAdminUserDto(data: unknown): AdminUserDto {
  return adminUserSchema.parse(data);
}

export function safeValidateAdminUserDto(data: unknown) {
  return adminUserSchema.safeParse(data);
}

/**
 * Onboarding Settings DTO (Step 3)
 */
export const onboardingSettingsSchema = z.object({
  timezone: z.string().default(DEFAULT_TENANT_SETTINGS.timezone),
  currency: z.string().default(DEFAULT_TENANT_SETTINGS.currency),
  locale: z.string().default(DEFAULT_TENANT_SETTINGS.locale),
  enabledFeatures: z.array(z.string()).optional().default([]),
});

export type OnboardingSettingsDto = z.infer<typeof onboardingSettingsSchema>;

export function validateOnboardingSettingsDto(data: unknown): OnboardingSettingsDto {
  return onboardingSettingsSchema.parse(data);
}

export function safeValidateOnboardingSettingsDto(data: unknown) {
  return onboardingSettingsSchema.safeParse(data);
}

/**
 * Complete Onboarding DTO
 */
export const completeOnboardingSchema = z.object({
  sessionId: z.string().uuid('Érvénytelen session ID'),
  confirmed: z.boolean().refine(val => val === true, 'Megerősítés szükséges'),
});

export type CompleteOnboardingDto = z.infer<typeof completeOnboardingSchema>;

export function validateCompleteOnboardingDto(data: unknown): CompleteOnboardingDto {
  return completeOnboardingSchema.parse(data);
}
