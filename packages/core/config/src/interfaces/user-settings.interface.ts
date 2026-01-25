/**
 * User Settings Interface
 * Epic 29: User Favorites (ADR-044)
 *
 * Provides interfaces for user-level preferences,
 * particularly menu favorites for quick navigation.
 */

/**
 * A single favorite menu item
 */
export interface UserFavorite {
  /** Menu item identifier (e.g., "rentals.active", "service.worksheets") */
  menuItemId: string;
  /** Display order in the favorites sidebar */
  order: number;
  /** When the favorite was added (audit) */
  addedAt: Date;
  /** Optional custom label override */
  label?: string;
}

/**
 * User settings entity
 */
export interface UserSettings {
  id: string;
  userId: string;
  tenantId: string;
  /** User's favorite menu items */
  favorites: UserFavorite[];
  /** Version number for conflict resolution */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for adding a new favorite
 */
export interface AddFavoriteDto {
  menuItemId: string;
  order?: number;
  label?: string;
}

/**
 * DTO for updating favorites order
 */
export interface UpdateFavoritesOrderDto {
  /** Array of menuItemIds in new order */
  orderedIds: string[];
}

/**
 * DTO for batch update of all favorites
 */
export interface UpdateFavoritesDto {
  favorites: Array<{
    menuItemId: string;
    order: number;
    label?: string;
  }>;
}

/**
 * Response DTO with version for sync
 */
export interface FavoritesResponseDto {
  favorites: UserFavorite[];
  version: number;
}

/**
 * Tenant-level default favorites per role
 */
export interface TenantDefaultFavorites {
  tenantId: string;
  roleDefaults: Record<string, string[]>; // role -> menuItemId[]
}

/**
 * Repository interface for UserSettings
 */
export interface IUserSettingsRepository {
  /**
   * Get user settings by userId
   */
  findByUserId(userId: string, tenantId: string): Promise<UserSettings | null>;

  /**
   * Create new user settings
   */
  create(data: {
    userId: string;
    tenantId: string;
    favorites?: UserFavorite[];
  }): Promise<UserSettings>;

  /**
   * Update user favorites
   */
  updateFavorites(
    userId: string,
    tenantId: string,
    favorites: UserFavorite[],
    expectedVersion?: number
  ): Promise<UserSettings>;

  /**
   * Get tenant default favorites
   */
  getTenantDefaults(tenantId: string): Promise<TenantDefaultFavorites | null>;

  /**
   * Set tenant default favorites
   */
  setTenantDefaults(
    tenantId: string,
    roleDefaults: Record<string, string[]>
  ): Promise<TenantDefaultFavorites>;
}

/** Maximum number of favorites allowed per user */
export const MAX_FAVORITES = 10;
