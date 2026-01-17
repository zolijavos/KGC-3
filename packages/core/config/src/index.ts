// Module
export { ConfigModule } from './config.module';
export type { ConfigModuleOptions } from './config.module';

// Services
export { ConfigService, CONFIG_REPOSITORY } from './services/config.service';
export { FeatureFlagService, FEATURE_FLAG_REPOSITORY } from './services/feature-flag.service';
export { TenantConfigService, TENANT_ID } from './services/tenant-config.service';
export { LicenseService, LICENSE_REPOSITORY } from './services/license.service';
export { ConfigCacheService } from './services/config-cache.service';

// Interfaces
export type {
  ConfigEntry,
  ConfigValueType,
  FeatureFlag,
  IConfigRepository,
  IFeatureFlagRepository,
  TypedConfigValue,
} from './interfaces/config.interface';

export type {
  License,
  LicenseType,
  LicenseStatus,
  LicenseValidationResult,
  LicenseLimits,
  ILicenseRepository,
} from './interfaces/license.interface';

export { DEFAULT_LICENSE_LIMITS } from './interfaces/license.interface';

// DTOs
export type {
  CreateConfigEntryDto,
  UpdateConfigEntryDto,
  ConfigEntryResponseDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  FeatureFlagResponseDto,
  ConfigValueTypeDto,
} from './dto/config.dto';

export {
  CreateConfigEntrySchema,
  UpdateConfigEntrySchema,
  ConfigEntryResponseSchema,
  CreateFeatureFlagSchema,
  UpdateFeatureFlagSchema,
  FeatureFlagResponseSchema,
  ConfigValueTypeSchema,
  validateConfigEntry,
  validateFeatureFlag,
} from './dto/config.dto';
