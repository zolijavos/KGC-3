/**
 * @kgc/tenant - Multi-tenant infrastructure for KGC ERP
 *
 * Provides:
 * - Tenant CRUD operations
 * - PostgreSQL schema per tenant
 * - Tenant audit logging
 * - Feature flag per tenant (Story 3-5)
 */

// Module
export { TenantModule, PRISMA_CLIENT } from './tenant.module';
export type { TenantModuleOptions } from './tenant.module';

// Services
export { TenantService } from './services/tenant.service';
export { SchemaService } from './services/schema.service';
export { RlsService } from './services/rls.service';
export { OnboardingService } from './services/onboarding.service';
export { FeatureFlagService } from './services/feature-flag.service';
export { HoldingService } from './services/holding.service';

// Controller
export { TenantController } from './tenant.controller';

// Middleware
export { TenantContextMiddleware } from './middleware/tenant-context.middleware';

// Decorators
export { CurrentTenant } from './decorators/current-tenant.decorator';
export {
  RequireFeature,
  RequireAnyFeature,
  RequireAllFeatures,
} from './decorators/require-feature.decorator';

// Guards
export { RequireFeatureGuard, FEATURE_FLAG_KEY } from './guards/require-feature.guard';

// Interfaces & Types - Values (enums, consts)
export {
  TenantStatus,
  DEFAULT_TENANT_SETTINGS,
} from './interfaces/tenant.interface';

// Interfaces & Types - Types only
export type {
  Tenant,
  TenantSettings,
  TenantListMeta,
  TenantListResponse,
  TenantAuditLogEntry,
} from './interfaces/tenant.interface';

export {
  RlsPolicyType,
} from './interfaces/rls.interface';

export type {
  RlsPolicy,
  CreateRlsPolicyDto,
  RlsTableStatus,
  TenantSessionContext,
  RlsActivationResult,
  BulkRlsActivationResult,
} from './interfaces/rls.interface';

export {
  OnboardingStep,
  OnboardingStatus,
} from './interfaces/onboarding.interface';

export type {
  OnboardingSession,
  OnboardingResult,
  OnboardingProgress,
  OnboardingTenantInfo,
  OnboardingAdminUser,
  OnboardingSettings,
} from './interfaces/onboarding.interface';

// DTOs - Schemas and functions are values
export {
  createTenantSchema,
  validateCreateTenantDto,
  safeValidateCreateTenantDto,
} from './dto/create-tenant.dto';

export type { CreateTenantDto } from './dto/create-tenant.dto';

export {
  updateTenantSchema,
  validateUpdateTenantDto,
  safeValidateUpdateTenantDto,
} from './dto/update-tenant.dto';

export type { UpdateTenantDto } from './dto/update-tenant.dto';

export {
  tenantFilterSchema,
  validateTenantFilterDto,
  safeValidateTenantFilterDto,
} from './dto/tenant-filter.dto';

export type { TenantFilterDto } from './dto/tenant-filter.dto';

export {
  startOnboardingSchema,
  validateStartOnboardingDto,
  safeValidateStartOnboardingDto,
  adminUserSchema,
  validateAdminUserDto,
  safeValidateAdminUserDto,
  onboardingSettingsSchema,
  validateOnboardingSettingsDto,
  safeValidateOnboardingSettingsDto,
  completeOnboardingSchema,
  validateCompleteOnboardingDto,
} from './dto/onboarding.dto';

export type {
  StartOnboardingDto,
  AdminUserDto,
  OnboardingSettingsDto,
  CompleteOnboardingDto,
} from './dto/onboarding.dto';

// Feature Flag Types - Values (enums, consts, functions)
export {
  FeatureFlag,
  PLAN_DEFAULT_FEATURES,
  FEATURE_FLAG_CONFIG,
  getAllFeatureFlags,
  isValidFeatureFlag,
} from './interfaces/feature-flag.interface';

// Feature Flag Types - Types only
export type {
  PlanType,
  FeatureFlagConfig,
  TenantFeatureStatus,
  FeatureCheckResult,
  UpdateTenantFeaturesDto,
} from './interfaces/feature-flag.interface';

// Holding Types
export type {
  TenantHierarchyNode,
  TenantHierarchyFlat,
  HoldingOverview,
  SetParentTenantDto,
  HoldingRelationship,
  CrossTenantScope,
} from './interfaces/holding.interface';
