/**
 * User Settings Interfaces
 * Epic 29: User Favorites (ADR-044)
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
  roleDefaults: Record<string, string[]>;
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
