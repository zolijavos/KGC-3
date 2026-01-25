/**
 * User Settings Module Exports
 * Epic 29: User Favorites (ADR-044)
 */

// Module
export { UserSettingsModule } from './user-settings.module';
export type { UserSettingsModuleOptions } from './user-settings.module';

// Controllers
export {
  MAX_FAVORITES,
  TenantDefaultFavoritesController,
  USER_SETTINGS_SERVICE,
  UserSettingsController,
} from './user-settings.controller';

// Repositories
export { PrismaUserSettingsRepository, USER_SETTINGS_REPOSITORY } from './repositories';

// Interfaces
export type {
  FavoritesResponseDto,
  IUserSettingsRepository,
  TenantDefaultFavorites,
  UserFavorite,
  UserSettings,
} from './interfaces';
