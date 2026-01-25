// Module
export { ConfigModule } from './config.module';
export type { ConfigModuleOptions } from './config.module';

// Services
export { ConfigCacheService } from './services/config-cache.service';
export { CONFIG_REPOSITORY, ConfigService } from './services/config.service';
export { FEATURE_FLAG_REPOSITORY, FeatureFlagService } from './services/feature-flag.service';
export { LICENSE_REPOSITORY, LicenseService } from './services/license.service';
export { TENANT_ID, TenantConfigService } from './services/tenant-config.service';

// User Settings Service (Epic 29: ADR-044)
export {
  FavoriteAlreadyExistsError,
  FavoriteNotFoundError,
  FavoritesLimitError,
  USER_SETTINGS_REPOSITORY,
  UserSettingsService,
  VersionConflictError,
} from './services/user-settings.service';

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
  ILicenseRepository,
  License,
  LicenseLimits,
  LicenseStatus,
  LicenseType,
  LicenseValidationResult,
} from './interfaces/license.interface';

export { DEFAULT_LICENSE_LIMITS } from './interfaces/license.interface';

// User Settings Interfaces (Epic 29: ADR-044)
export type {
  AddFavoriteDto,
  FavoritesResponseDto,
  IUserSettingsRepository,
  TenantDefaultFavorites,
  UpdateFavoritesDto,
  UpdateFavoritesOrderDto,
  UserFavorite,
  UserSettings,
} from './interfaces/user-settings.interface';

export { MAX_FAVORITES } from './interfaces/user-settings.interface';

// DTOs
export type {
  ConfigEntryResponseDto,
  ConfigValueTypeDto,
  CreateConfigEntryDto,
  CreateFeatureFlagDto,
  FeatureFlagResponseDto,
  UpdateConfigEntryDto,
  UpdateFeatureFlagDto,
} from './dto/config.dto';

export {
  ConfigEntryResponseSchema,
  ConfigValueTypeSchema,
  CreateConfigEntrySchema,
  CreateFeatureFlagSchema,
  FeatureFlagResponseSchema,
  UpdateConfigEntrySchema,
  UpdateFeatureFlagSchema,
  validateConfigEntry,
  validateFeatureFlag,
} from './dto/config.dto';
