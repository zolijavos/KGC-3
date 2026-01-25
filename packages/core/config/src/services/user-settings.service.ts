/**
 * User Settings Service
 * Epic 29: User Favorites (ADR-044)
 *
 * Manages user preferences and favorites.
 * Supports offline-first sync with version-based conflict resolution.
 */

import { Inject, Injectable } from '@nestjs/common';
import type {
  AddFavoriteDto,
  FavoritesResponseDto,
  IUserSettingsRepository,
  TenantDefaultFavorites,
  UpdateFavoritesDto,
  UserFavorite,
  UserSettings,
} from '../interfaces/user-settings.interface';
import { MAX_FAVORITES } from '../interfaces/user-settings.interface';

export const USER_SETTINGS_REPOSITORY = 'USER_SETTINGS_REPOSITORY';

export class FavoritesLimitError extends Error {
  constructor() {
    super(`Maximum ${MAX_FAVORITES} favorites allowed`);
    this.name = 'FavoritesLimitError';
  }
}

export class FavoriteAlreadyExistsError extends Error {
  constructor(menuItemId: string) {
    super(`Favorite "${menuItemId}" already exists`);
    this.name = 'FavoriteAlreadyExistsError';
  }
}

export class FavoriteNotFoundError extends Error {
  constructor(menuItemId: string) {
    super(`Favorite "${menuItemId}" not found`);
    this.name = 'FavoriteNotFoundError';
  }
}

export class VersionConflictError extends Error {
  constructor(expected: number, actual: number) {
    super(`Version conflict: expected ${expected}, got ${actual}`);
    this.name = 'VersionConflictError';
  }
}

@Injectable()
export class UserSettingsService {
  constructor(
    @Inject(USER_SETTINGS_REPOSITORY)
    private readonly repository: IUserSettingsRepository
  ) {}

  /**
   * Get user favorites with version for sync
   */
  async getFavorites(userId: string, tenantId: string): Promise<FavoritesResponseDto> {
    let settings = await this.repository.findByUserId(userId, tenantId);

    // Auto-create settings with tenant defaults if not exist
    if (!settings) {
      settings = await this.initializeUserSettings(userId, tenantId);
    }

    return {
      favorites: settings.favorites,
      version: settings.version,
    };
  }

  /**
   * Add a single favorite
   */
  async addFavorite(
    userId: string,
    tenantId: string,
    dto: AddFavoriteDto
  ): Promise<FavoritesResponseDto> {
    let settings = await this.repository.findByUserId(userId, tenantId);

    if (!settings) {
      settings = await this.initializeUserSettings(userId, tenantId);
    }

    // Check if already exists
    const existingIndex = settings.favorites.findIndex(f => f.menuItemId === dto.menuItemId);
    if (existingIndex !== -1) {
      throw new FavoriteAlreadyExistsError(dto.menuItemId);
    }

    // Check limit
    if (settings.favorites.length >= MAX_FAVORITES) {
      throw new FavoritesLimitError();
    }

    // Calculate order - append at end if not specified
    const maxOrder = settings.favorites.reduce((max, f) => Math.max(max, f.order), 0);
    const newOrder = dto.order ?? maxOrder + 1;

    const newFavorite: UserFavorite = {
      menuItemId: dto.menuItemId,
      order: newOrder,
      addedAt: new Date(),
      ...(dto.label !== undefined && { label: dto.label }),
    };

    const updatedFavorites = [...settings.favorites, newFavorite];

    const updated = await this.repository.updateFavorites(userId, tenantId, updatedFavorites);

    return {
      favorites: updated.favorites,
      version: updated.version,
    };
  }

  /**
   * Remove a favorite
   */
  async removeFavorite(
    userId: string,
    tenantId: string,
    menuItemId: string
  ): Promise<FavoritesResponseDto> {
    const settings = await this.repository.findByUserId(userId, tenantId);

    if (!settings) {
      throw new FavoriteNotFoundError(menuItemId);
    }

    const existingIndex = settings.favorites.findIndex(f => f.menuItemId === menuItemId);

    if (existingIndex === -1) {
      throw new FavoriteNotFoundError(menuItemId);
    }

    const updatedFavorites = settings.favorites.filter(f => f.menuItemId !== menuItemId);

    // Re-normalize order
    const normalizedFavorites = updatedFavorites.map((f, idx) => ({
      ...f,
      order: idx + 1,
    }));

    const updated = await this.repository.updateFavorites(userId, tenantId, normalizedFavorites);

    return {
      favorites: updated.favorites,
      version: updated.version,
    };
  }

  /**
   * Batch update all favorites (for reorder or full sync)
   */
  async updateFavorites(
    userId: string,
    tenantId: string,
    dto: UpdateFavoritesDto,
    expectedVersion?: number
  ): Promise<FavoritesResponseDto> {
    // Validate limit
    if (dto.favorites.length > MAX_FAVORITES) {
      throw new FavoritesLimitError();
    }

    // Validate unique menuItemIds
    const uniqueIds = new Set(dto.favorites.map(f => f.menuItemId));
    if (uniqueIds.size !== dto.favorites.length) {
      throw new Error('Duplicate menuItemIds in favorites');
    }

    // Build favorites with addedAt
    const settings = await this.repository.findByUserId(userId, tenantId);
    const existingMap = new Map(settings?.favorites.map(f => [f.menuItemId, f.addedAt]) ?? []);

    const newFavorites: UserFavorite[] = dto.favorites.map(f => ({
      menuItemId: f.menuItemId,
      order: f.order,
      addedAt: existingMap.get(f.menuItemId) ?? new Date(),
      ...(f.label !== undefined && { label: f.label }),
    }));

    const updated = await this.repository.updateFavorites(
      userId,
      tenantId,
      newFavorites,
      expectedVersion
    );

    return {
      favorites: updated.favorites,
      version: updated.version,
    };
  }

  /**
   * Get tenant default favorites
   */
  async getTenantDefaults(tenantId: string): Promise<TenantDefaultFavorites | null> {
    return this.repository.getTenantDefaults(tenantId);
  }

  /**
   * Set tenant default favorites (admin only)
   */
  async setTenantDefaults(
    tenantId: string,
    roleDefaults: Record<string, string[]>
  ): Promise<TenantDefaultFavorites> {
    // Validate each role's favorites don't exceed limit
    for (const [role, favorites] of Object.entries(roleDefaults)) {
      if (favorites.length > MAX_FAVORITES) {
        throw new Error(`Role "${role}" exceeds maximum ${MAX_FAVORITES} favorites`);
      }
    }

    return this.repository.setTenantDefaults(tenantId, roleDefaults);
  }

  /**
   * Initialize user settings with tenant defaults based on role
   */
  private async initializeUserSettings(
    userId: string,
    tenantId: string,
    userRole?: string
  ): Promise<UserSettings> {
    let initialFavorites: UserFavorite[] = [];

    // Try to get tenant defaults
    const tenantDefaults = await this.repository.getTenantDefaults(tenantId);

    if (tenantDefaults && userRole) {
      const roleMenuItems = tenantDefaults.roleDefaults[userRole];
      if (roleMenuItems) {
        initialFavorites = roleMenuItems.map((menuItemId, idx) => ({
          menuItemId,
          order: idx + 1,
          addedAt: new Date(),
        }));
      }
    }

    return this.repository.create({
      userId,
      tenantId,
      favorites: initialFavorites,
    });
  }
}
