/**
 * Onboarding Interface Types
 * @kgc/tenant - Tenant onboarding wizard infrastructure
 */

/**
 * Onboarding lépések
 */
export enum OnboardingStep {
  TENANT_INFO = 'TENANT_INFO',
  ADMIN_USER = 'ADMIN_USER',
  SETTINGS = 'SETTINGS',
  CONFIRMATION = 'CONFIRMATION',
  CREATING = 'CREATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Onboarding session státusz
 */
export enum OnboardingStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Onboarding tenant info (Step 1)
 */
export interface OnboardingTenantInfo {
  name: string;
  slug: string;
  contactEmail: string;
  planType?: 'basic' | 'standard' | 'premium';
}

/**
 * Onboarding admin user (Step 2)
 */
export interface OnboardingAdminUser {
  name: string;
  email: string;
  password: string;
}

/**
 * Onboarding settings (Step 3)
 */
export interface OnboardingSettings {
  timezone: string;
  currency: string;
  locale: string;
  enabledFeatures?: string[];
}

/**
 * Onboarding session
 */
export interface OnboardingSession {
  id: string;
  currentStep: OnboardingStep;
  status: OnboardingStatus;
  tenantInfo?: OnboardingTenantInfo;
  adminUser?: OnboardingAdminUser;
  settings?: OnboardingSettings;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Onboarding result
 */
export interface OnboardingResult {
  success: boolean;
  tenantId?: string;
  adminUserId?: string;
  error?: string;
}

/**
 * Onboarding progress
 */
export interface OnboardingProgress {
  sessionId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  remainingSteps: OnboardingStep[];
  percentComplete: number;
}
